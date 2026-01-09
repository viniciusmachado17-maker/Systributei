import { createClient } from 'npm:@supabase/supabase-js@2.39.8'
import Stripe from 'npm:stripe@16.12.0'

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || ''
const stripe = new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
    telemetry: false,
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

Deno.serve(async (req) => {
    const signature = req.headers.get('stripe-signature')

    try {
        const body = await req.text()
        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
            undefined,
            cryptoProvider
        )

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                let orgId = session.metadata?.orgId
                const subscriptionId = session.subscription as string
                const customerId = session.customer as string

                const subscription = await stripe.subscriptions.retrieve(subscriptionId)
                if (!orgId) orgId = subscription.metadata?.orgId

                if (!orgId) return new Response(JSON.stringify({ error: 'OrgId not found' }), { status: 400 })

                const { planType, limits } = getPlanDetails(subscription.items.data[0].price.id)

                await supabaseAdmin.from('organizations').update({
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    subscription_status: 'active',
                    plan_type: planType,
                    price_id: subscription.items.data[0].price.id,
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    has_commitment: isCommitmentPrice(subscription.items.data[0].price.id),
                    usage_limit: limits.usage,
                    email_limit: limits.email,
                    request_limit: limits.requests
                }).eq('id', orgId)

                if (customerId) {
                    const activeSubs = await stripe.subscriptions.list({ customer: customerId, status: 'active' })
                    for (const sub of activeSubs.data) {
                        if (sub.id !== subscriptionId) await stripe.subscriptions.cancel(sub.id);
                    }
                }
                break
            }

            case 'invoice.paid': {
                const invoice = event.data.object
                if (invoice.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
                    let orgId = subscription.metadata?.orgId
                    if (!orgId) {
                        const { data: org } = await supabaseAdmin.from('organizations').select('id').eq('stripe_customer_id', subscription.customer).single();
                        if (org) orgId = org.id;
                    }
                    if (orgId) {
                        const { planType, limits } = getPlanDetails(subscription.items.data[0].price.id)
                        await supabaseAdmin.from('organizations').update({
                            subscription_status: 'active',
                            plan_type: planType,
                            price_id: subscription.items.data[0].price.id,
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                            usage_limit: limits.usage,
                            email_limit: limits.email,
                            request_limit: limits.requests
                        }).eq('id', orgId)
                    }
                }
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object
                let orgId = subscription.metadata?.orgId
                if (!orgId) {
                    const { data: org } = await supabaseAdmin.from('organizations').select('id').eq('stripe_customer_id', subscription.customer).single();
                    if (org) orgId = org.id;
                }
                if (orgId) {
                    const { data: currentOrg } = await supabaseAdmin.from('organizations').select('price_id').eq('id', orgId).single();
                    const newPriceId = subscription.items.data[0].price.id;
                    const { planType: newPlanType, rank: newRank, limits: newLimits } = getPlanDetails(newPriceId);
                    const { rank: currentRank } = getPlanDetails(currentOrg?.price_id || '');

                    const updateData: any = {
                        subscription_status: subscription.status,
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    };

                    if (newRank >= currentRank) {
                        updateData.plan_type = newPlanType;
                        updateData.price_id = newPriceId;
                        updateData.usage_limit = newLimits.usage;
                        updateData.email_limit = newLimits.email;
                        updateData.request_limit = newLimits.requests;
                        updateData.has_commitment = isCommitmentPrice(newPriceId);
                    }
                    await supabaseAdmin.from('organizations').update(updateData).eq('id', orgId)
                }
                break
            }
        }
        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (err: any) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})

function getPlanDetails(priceId: string) {
    const mapping: Record<string, { type: string, rank: number }> = {
        'price_1SnTgNFkPBkTRBNfbrMpB1Qr': { type: 'start', rank: 1 },
        'price_1SnTjVFkPBkTRBNfm1ZxQfdn': { type: 'pro', rank: 2 },
        'price_1SnTmZFkPBkTRBNfAzqkRru9': { type: 'premium', rank: 3 }
    }
    const details = mapping[priceId] || { type: 'gratis', rank: 0 }
    const limitsConfig: Record<string, any> = {
        'gratis': { usage: 10, email: 1, requests: 1 },
        'start': { usage: 300, email: 5, requests: 30 },
        'pro': { usage: 999999, email: 15, requests: 50 },
        'premium': { usage: 999999, email: 999999, requests: 100 }
    }
    return { planType: details.type, rank: details.rank, limits: limitsConfig[details.type] || limitsConfig['gratis'] }
}

function isCommitmentPrice(priceId: string): boolean {
    return ['price_1SnTgNFkPBkTRBNfbrMpB1Qr', 'price_1SnTjVFkPBkTRBNfm1ZxQfdn', 'price_1SnTmZFkPBkTRBNfAzqkRru9'].includes(priceId)
}
