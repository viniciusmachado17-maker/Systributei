import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeKey) {
            throw new Error('STRIPE_SECRET_KEY not found in Edge Function secrets');
        }

        const stripe = new Stripe(stripeKey, {
            httpClient: Stripe.createFetchHttpClient(),
        })

        const body = await req.json()
        const { priceId, orgId, userId, successUrl, cancelUrl } = body

        console.log(`Processing checkout for org: ${orgId}, price: ${priceId}`);

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verificação rápida do usuário (opcional se confiarmos no authHeader, mas bom para logs)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            throw new Error('User authentication failed: ' + (userError?.message || 'Unauthorized'));
        }

        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', orgId)
            .single()

        if (orgError) throw new Error('Organization not found: ' + orgError.message);

        let customerId = org?.stripe_customer_id

        if (customerId) {
            try {
                // Verifica se o cliente existe
                await stripe.customers.retrieve(customerId);
            } catch (err) {
                console.warn('Invalid customer ID, clearing...', customerId);
                customerId = null;
            }
        }

        if (!customerId) {
            console.log('Creating new Stripe customer...');
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { orgId, userId }
            })
            customerId = customer.id

            await supabaseAdmin
                .from('organizations')
                .update({ stripe_customer_id: customerId })
                .eq('id', orgId)
        }

        console.log(`Creating session for customer: ${customerId}, price: ${priceId}`);

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { orgId, userId },
            subscription_data: {
                metadata: { orgId, userId }
            }
        })

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error) {
        console.error('Checkout error detail:', error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        })
    }
})
