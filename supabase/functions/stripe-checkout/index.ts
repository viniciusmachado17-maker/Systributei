import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import Stripe from 'https://esm.sh/stripe@14.23.0?target=deno'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("Stripe Checkout Function Invoked");

        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!stripeKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
            throw new Error('Configurações do servidor incompletas');
        }

        const stripe = new Stripe(stripeKey, {
            httpClient: Stripe.createFetchHttpClient(),
        })

        const body = await req.json()
        const { priceId, orgId, userId, successUrl, cancelUrl } = body

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Não autorizado');

        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Token inválido');

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('stripe_customer_id, stripe_subscription_id, subscription_status')
            .eq('id', orgId)
            .single()

        if (orgError) throw new Error("Org não encontrada");

        let customerId = org?.stripe_customer_id

        if (org?.stripe_subscription_id && (org.subscription_status === 'active' || org.subscription_status === 'trialing')) {
            try {
                const existingSub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
                if (existingSub && existingSub.status === 'active') {
                    const currentPriceId = existingSub.items.data[0].price.id;

                    if (currentPriceId === priceId) {
                        return new Response(JSON.stringify({ updated: true, message: 'Você já está neste plano' }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200
                        })
                    }

                    const { rank: currentRank } = getPlanDetails(currentPriceId);
                    const { rank: newRank, planType: newPlanType, limits: newLimits } = getPlanDetails(priceId);

                    if (newRank >= currentRank) {
                        const updatedSub = await stripe.subscriptions.update(existingSub.id, {
                            items: [{ id: existingSub.items.data[0].id, price: priceId }],
                            proration_behavior: 'always_invoice',
                        });

                        await supabaseAdmin.from('organizations').update({
                            plan_type: newPlanType,
                            price_id: priceId,
                            subscription_status: 'active',
                            current_period_end: new Date(updatedSub.current_period_end * 1000).toISOString(),
                            usage_limit: newLimits.usage,
                            email_limit: newLimits.email,
                            request_limit: newLimits.requests
                        }).eq('id', orgId);

                        return new Response(JSON.stringify({ updated: true, message: 'Upgrade realizado!' }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200
                        });
                    } else {
                        await stripe.subscriptions.update(existingSub.id, {
                            items: [{ id: existingSub.items.data[0].id, price: priceId }],
                            proration_behavior: 'none',
                        });

                        return new Response(JSON.stringify({ updated: true, message: 'Plano alterado para o próximo ciclo!' }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200
                        });
                    }
                }
            } catch (err) {
                console.error("Error updating subscription:", err);
            }
        }

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { orgId, userId }
            })
            customerId = customer.id
            await supabaseAdmin.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId);
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { orgId, userId },
            subscription_data: { metadata: { orgId, userId } },
            locale: 'pt-BR'
        })

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error) {
        console.error('Checkout error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        })
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
    return {
        planType: details.type,
        rank: details.rank,
        limits: limitsConfig[details.type] || limitsConfig['gratis']
    }
}
