import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
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
                let userId = session.metadata?.userId
                const subscriptionId = session.subscription as string
                const customerId = session.customer as string

                console.log(`Checkout completed. Session Metadata:`, session.metadata);

                const subscription = await stripe.subscriptions.retrieve(subscriptionId)

                if (!orgId) {
                    console.log(`OrgId not found in session metadata, checking subscription metadata...`);
                    orgId = subscription.metadata?.orgId
                    userId = subscription.metadata?.userId
                }

                if (!orgId) {
                    console.error(`ERROR: Could not find orgId for session ${session.id}`);
                    return new Response(JSON.stringify({ error: 'OrgId not found' }), { status: 400 })
                }

                const { planType, limits } = mapPriceToPlan(subscription.items.data[0].price.id)

                console.log(`Updating org ${orgId} to plan ${planType}`);

                const { error: updateError } = await supabaseAdmin
                    .from('organizations')
                    .update({
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
                    })
                    .eq('id', orgId)

                if (updateError) {
                    console.error(`Error updating org ${orgId} after checkout:`, updateError);
                } else {
                    console.log(`Org ${orgId} updated successfully after checkout.`);
                }
                break
            }

            case 'invoice.paid': {
                const invoice = event.data.object
                if (invoice.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
                    const { orgId } = subscription.metadata
                    const { limits } = mapPriceToPlan(subscription.items.data[0].price.id)

                    await supabaseAdmin
                        .from('organizations')
                        .update({
                            subscription_status: 'active',
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                            usage_limit: limits.usage,
                            email_limit: limits.email,
                            request_limit: limits.requests
                        })
                        .eq('id', orgId)
                }
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object
                if (invoice.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
                    const { orgId } = subscription.metadata
                    await supabaseAdmin
                        .from('organizations')
                        .update({ subscription_status: 'past_due' })
                        .eq('id', orgId)
                }
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object
                const { orgId } = subscription.metadata
                console.log(`Processing subscription updated for org: ${orgId}`, { cancel: subscription.cancel_at_period_end });

                const { planType, limits } = mapPriceToPlan(subscription.items.data[0].price.id)

                const { error: updateError } = await supabaseAdmin
                    .from('organizations')
                    .update({
                        subscription_status: subscription.status,
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        plan_type: planType,
                        price_id: subscription.items.data[0].price.id,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        has_commitment: isCommitmentPrice(subscription.items.data[0].price.id),
                        usage_limit: limits.usage,
                        email_limit: limits.email,
                        request_limit: limits.requests
                    })
                    .eq('id', orgId)

                if (updateError) {
                    console.error(`Error updating organization ${orgId}:`, updateError);
                } else {
                    console.log(`Organization ${orgId} updated successfully via webhook.`);
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                const { orgId } = subscription.metadata
                await supabaseAdmin
                    .from('organizations')
                    .update({
                        subscription_status: 'canceled',
                        plan_type: 'gratis',
                        usage_limit: 10,
                        request_limit: 1,
                        email_limit: 1
                    })
                    .eq('id', orgId)
                break
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})

function mapPriceToPlan(priceId: string): {
    planType: string,
    limits: { usage: number, email: number, requests: number }
} {
    const mapping: Record<string, string> = {
        'price_1SjRiwFkPBkTRBNfsjxZBscY': 'start',
        'price_1SjmM3FkPBkTRBNfqvA7GBuF': 'start',
        'price_1SjmRKFkPBkTRBNflIqVvWzE': 'pro',
        'price_1SjmRuFkPBkTRBNfGsl9dfau': 'pro',
        'price_1SjmT9FkPBkTRBNfuN3mH65n': 'premium',
        'price_1SjmSeFkPBkTRBNf0xExnXGD': 'premium'
    }

    const planType = mapping[priceId] || 'gratis'

    const limitsConfig: Record<string, { usage: number, email: number, requests: number }> = {
        'gratis': { usage: 10, email: 1, requests: 1 },
        'start': { usage: 300, email: 5, requests: 30 },
        'pro': { usage: 999999, email: 15, requests: 50 },
        'premium': { usage: 999999, email: 999999, requests: 100 }
    }

    return { planType, limits: limitsConfig[planType] || limitsConfig['gratis'] }
}

function isCommitmentPrice(priceId: string): boolean {
    const commitments = [
        'price_1SjRiwFkPBkTRBNfsjxZBscY', // Start 12m
        'price_1SjmRKFkPBkTRBNflIqVvWzE', // Pro 12m
        'price_1SjmT9FkPBkTRBNfuN3mH65n'  // Premium 12m
    ]
    return commitments.includes(priceId)
}
