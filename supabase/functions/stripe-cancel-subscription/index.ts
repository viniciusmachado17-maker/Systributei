import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Cabeçalho de autorização ausente')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Não autorizado')

        const { orgId } = await req.json()

        // Verify if user belongs to organization
        const { data: org, error: orgError } = await supabaseClient
            .from('organizations')
            .select('stripe_subscription_id, has_commitment, created_at')
            .eq('id', orgId)
            .single()

        if (orgError || !org) throw new Error('Organização não encontrada')
        if (!org.stripe_subscription_id) throw new Error('Nenhuma assinatura ativa encontrada')

        // Stripe Cancellation
        await stripe.subscriptions.update(org.stripe_subscription_id, {
            cancel_at_period_end: true
        })

        // Fallback: Update DB directly in case webhook fails/delays
        await supabaseClient
            .from('organizations')
            .update({ cancel_at_period_end: true })
            .eq('id', orgId)

        return new Response(JSON.stringify({ success: true, message: 'Cancelamento agendado para o fim do período.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        })
    }
})
