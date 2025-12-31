import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno' // Versão estável

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Obter headers de autenticação
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        // 2. Validar Token
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !user) throw new Error('Invalid Token')

        // 3. Verificar Role Admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Unauthorized: User is not admin' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        // 4. Processar Ação
        const { action, payload } = await req.json()

        let result;
        if (action === 'list_subscribers') {
            const { data: orgs, error } = await supabase
                .from('organizations')
                .select(`*, profiles (email, name)`)
                .order('created_at', { ascending: false })
            if (error) throw error;

            result = orgs;

        } else if (action === 'update_plan') {
            const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
                httpClient: Stripe.createFetchHttpClient(),
            })
            result = await updatePlan(supabase, stripe, payload)

        } else if (action === 'add_member') {
            result = await addMember(supabase, payload)
        } else {
            throw new Error('Action not found')
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

async function updatePlan(supabase: any, stripe: any, payload: any) {
    const { orgId, newPriceId, newPlanType, newBillingDate, billingDay, hasCommitment } = payload

    const { data: org } = await supabase
        .from('organizations')
        .select('stripe_subscription_id')
        .eq('id', orgId)
        .single()

    let stripeBillingDate = null
    let dbAccessDate = newBillingDate ? new Date(newBillingDate) : null

    // Regra: Cobrança dia 1-5, Confirmação dia +1 às 00:01
    if (billingDay >= 1 && billingDay <= 5) {
        const now = new Date()
        const nextMonth = now.getMonth() + 1
        const year = now.getFullYear()

        // Data real que o Stripe vai cobrar (Ancoragem)
        stripeBillingDate = new Date(year, nextMonth, billingDay, 12, 0, 0)

        // Data que o sistema vai exigir o pagamento (Tolerância de 1 dia)
        dbAccessDate = new Date(year, nextMonth, billingDay + 1, 0, 1, 0)
    }

    if (org?.stripe_subscription_id && newPriceId) {
        try {
            const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)

            const updateParams: any = {
                items: [{
                    id: subscription.items.data[0].id,
                    price: newPriceId,
                }],
                proration_behavior: 'none',
            }

            // O Stripe recebe a data exata da cobrança
            const targetStripeDate = stripeBillingDate || dbAccessDate
            if (targetStripeDate) {
                const timestamp = Math.floor(targetStripeDate.getTime() / 1000)
                if (timestamp > Math.floor(Date.now() / 1000)) {
                    updateParams.trial_end = timestamp
                }
            }

            await stripe.subscriptions.update(org.stripe_subscription_id, updateParams)
        } catch (e) {
            console.log("Stripe Error (ignorable):", e.message)
        }
    }

    const limitsConfig: any = {
        'gratis': { usage: 10, email: 1, requests: 1, max_users: 1 },
        'start': { usage: 300, email: 5, requests: 30, max_users: 1 },
        'pro': { usage: 999999, email: 15, requests: 50, max_users: 1 },
        'premium': { usage: 999999, email: 999999, requests: 100, max_users: 5 },
        'enterprise': { usage: 999999, email: 999999, requests: 999, max_users: 20 }
    }
    const limits = limitsConfig[newPlanType] || limitsConfig['gratis']

    await supabase
        .from('organizations')
        .update({
            plan_type: newPlanType,
            price_id: newPriceId,
            usage_limit: limits.usage,
            request_limit: limits.requests,
            email_limit: limits.email,
            max_users: limits.max_users,
            billing_day: billingDay || null,
            current_period_end: dbAccessDate ? dbAccessDate.toISOString() : null,
            subscription_status: 'active',
            has_commitment: hasCommitment
        })
        .eq('id', orgId)

    return { success: true }
}

async function addMember(supabase: any, payload: any) {
    const { email, orgId } = payload

    // 1. Verificar Organização e Limites
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select(`
            plan_type, 
            max_users,
            profiles (count)
        `)
        .eq('id', orgId)
        .single()

    if (orgError || !org) throw new Error('Organização não encontrada')

    const currentCount = org.profiles[0]?.count || 0
    const plan = org.plan_type

    // Regra: Somente Premium/Enterprise podem ter membros (Pro = 1 usuário apenas)
    if (!['premium', 'enterprise'].includes(plan)) {
        throw new Error(`O plano ${plan.toUpperCase()} permite apenas 1 usuário (o dono). Faça upgrade para Premium.`)
    }

    // Regra: Limite de 5 usuários para Premium
    if (plan === 'premium' && currentCount >= 5) {
        throw new Error('Limite de 5 usuários atingido para o plano Premium.')
    }

    // 2. Buscar Usuário para Adicionar
    const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

    if (!userProfile) throw new Error('Usuário não encontrado. Ele precisa criar uma conta primeiro.')

    // 3. Adicionar
    await supabase
        .from('profiles')
        .update({ organization_id: orgId, role: 'member' })
        .eq('id', userProfile.id)

    return { success: true }
}