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

// Função para verificar feriados brasileiros fixos e finais de semana
function getNextBusinessDay(date: Date): Date {
    const holidays = [
        '01-01', // Ano Novo
        '21-04', // Tiradentes
        '01-05', // Dia do Trabalho
        '07-09', // Independência
        '12-10', // Padroeira
        '02-11', // Finados
        '15-11', // República
        '20-11', // Consciência Negra
        '25-12', // Natal
        '01-01', // Confraternização
    ]

    let current = new Date(date)

    // Loop para encontrar o próximo dia útil
    while (true) {
        const dayOfWeek = current.getDay() // 0 = Domingo, 6 = Sábado
        const dayMonth = `${String(current.getDate()).padStart(2, '0')}-${String(current.getMonth() + 1).padStart(2, '0')}`

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const isHoliday = holidays.includes(dayMonth)

        if (!isWeekend && !isHoliday) {
            break
        }

        // Se for fim de semana ou feriado, pula para o próximo dia
        current.setDate(current.getDate() + 1)
        // Resetamos a hora para o início do expediente comercial (ex: 09:00)
        current.setHours(9, 0, 0, 0)
    }

    return current
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const { priceId, orgId, userId, successUrl, cancelUrl } = body

        const authHeader = req.headers.get('Authorization')
        console.log('Auth Header present:', !!authHeader);

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader || '' } } }
        )

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            console.error('Auth verification failed:', userError?.message || 'No user found');
            throw new Error('Unauthorized');
        }

        console.log('User verified:', user.email);

        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', orgId)
            .single()

        if (orgError) {
            console.error('Error fetching org:', orgError.message);
            throw new Error(`Error fetching organization: ${orgError.message}`);
        }

        let customerId = org?.stripe_customer_id

        if (!customerId) {
            console.log('Creating new Stripe customer for:', user.email);
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { orgId, userId }
            })
            customerId = customer.id

            const { error: updateError } = await supabaseAdmin
                .from('organizations')
                .update({ stripe_customer_id: customerId })
                .eq('id', orgId)

            if (updateError) {
                console.error('Error updating org with customerId:', updateError.message);
                throw new Error('Failed to save customer information');
            }
        } else {
            // Se já existe cliente, cancela assinaturas ATIVAS anteriores para evitar duplicidade
            console.log('Checking for existing subscriptions for customer:', customerId);
            const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'active'
            });

            for (const sub of subscriptions.data) {
                console.log('Canceling previous active subscription:', sub.id);
                await stripe.subscriptions.cancel(sub.id);
            }
        }

        // --- Lógica de Dia Útil ---
        const now = new Date()
        const businessDay = getNextBusinessDay(now)
        const isTodayBusinessDay = businessDay.toDateString() === now.toDateString()

        const sessionConfig: any = {
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { orgId, userId },
            subscription_data: {
                metadata: { orgId, userId }
            }
        }

        // Se hoje não for dia útil, suspendemos a cobrança até o próximo dia útil (Trial curto)
        if (!isTodayBusinessDay) {
            sessionConfig.subscription_data.trial_end = Math.floor(businessDay.getTime() / 1000)
        }

        const session = await stripe.checkout.sessions.create(sessionConfig)

        return new Response(JSON.stringify({ url: session.url }), {
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
