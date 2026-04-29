import { createClient } from 'npm:@supabase/supabase-js@2.39.8'
import Stripe from 'npm:stripe@16.12.0'
import { PRICE_TO_PLAN, PLAN_LIMITS } from '../_shared/stripe_constants.ts'

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
                const orgId = session.metadata?.orgId
                const customerId = session.customer as string
                const type = session.metadata?.type
                const jobId = session.metadata?.jobId

                // One-off Payment Logic (Spreadsheets)
                if (session.mode === 'payment' && type === 'spreadsheet_process' && jobId) {
                    await supabaseAdmin.from('spreadsheet_jobs').update({
                        is_paid: true,
                        status: 'processing' // Inicia processamento automático
                    }).eq('id', jobId)
                    break
                }

                // Subscription Logic
                const subscriptionId = session.subscription as string
                const subscription = await stripe.subscriptions.retrieve(subscriptionId)
                let resolvedOrgId = orgId
                if (!resolvedOrgId) resolvedOrgId = subscription.metadata?.orgId

                if (!resolvedOrgId) return new Response(JSON.stringify({ error: 'OrgId not found' }), { status: 400 })

                const { planType, limits } = getPlanDetails(subscription.items.data[0].price.id)

                await supabaseAdmin.from('organizations').update({
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    subscription_status: subscription.status,
                    plan_type: planType,
                    price_id: subscription.items.data[0].price.id,
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    has_commitment: isCommitmentPrice(subscription.items.data[0].price.id),
                    usage_limit: limits.usage,
                    email_limit: limits.email,
                    request_limit: limits.requests
                }).eq('id', resolvedOrgId)

                if (customerId) {
                    const activeSubs = await stripe.subscriptions.list({ customer: customerId, status: 'active' })
                    for (const sub of activeSubs.data) {
                        if (sub.id !== subscriptionId) await stripe.subscriptions.cancel(sub.id);
                    }
                }
                break
            }

            case 'checkout.session.async_payment_succeeded': {
                const session = event.data.object
                const subscriptionId = session.subscription as string
                const { data: org } = await supabaseAdmin.from('organizations').select('id').eq('stripe_subscription_id', subscriptionId).single();

                if (org) {
                    await supabaseAdmin.from('organizations').update({
                        subscription_status: 'active'
                    }).eq('id', org.id)
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
    const details = PRICE_TO_PLAN[priceId] || { type: 'gratis', rank: 0 }
    return { planType: details.type, rank: details.rank, limits: PLAN_LIMITS[details.type] || PLAN_LIMITS['gratis'] }
}

function isCommitmentPrice(priceId: string): boolean {
    return ['price_1SnTgNFkPBkTRBNfbrMpB1Qr', 'price_1SnTjVFkPBkTRBNfm1ZxQfdn', 'price_1SnTmZFkPBkTRBNfAzqkRru9'].includes(priceId)
}
