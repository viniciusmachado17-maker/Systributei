import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lista de feriados nacionais brasileiros fixos
const BRAZIL_HOLIDAYS = [
    '01-01', // Ano Novo
    '21-04', // Tiradentes
    '01-05', // Dia do Trabalho
    '07-09', // Independência
    '12-10', // Padroeira
    '02-11', // Finados
    '15-11', // República
    '20-11', // Consciência Negra
    '25-12', // Natal
]

function isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay() // 0 = Domingo, 6 = Sábado
    if (dayOfWeek === 0 || dayOfWeek === 6) return false

    const dayMonth = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (BRAZIL_HOLIDAYS.includes(dayMonth)) return false

    return true
}

// Retorna o N-ésimo dia útil a partir de uma data (não contando a própria data se for útil)
function getNthBusinessDay(startDate: Date, n: number): Date {
    let current = new Date(startDate)
    let found = 0

    // Adicionamos dias até encontrar o N-ésimo dia útil
    while (found < n) {
        current.setDate(current.getDate() + 1)
        if (isBusinessDay(current)) {
            found++
        }
    }

    // Define horário comercial para o vencimento (09:00 AM)
    current.setHours(9, 0, 0, 0)
    return current
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not found');

        const stripe = new Stripe(stripeKey, {
            httpClient: Stripe.createFetchHttpClient(),
        })

        const body = await req.json()
        const { priceId, orgId, userId, successUrl, cancelUrl } = body

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header');

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized');

        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', orgId)
            .single()

        let customerId = org?.stripe_customer_id
        if (customerId) {
            try {
                await stripe.customers.retrieve(customerId);
            } catch {
                customerId = null;
            }
        }

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { orgId, userId }
            })
            customerId = customer.id
            await supabaseAdmin.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId)
        }

        // --- Lógica do Segundo Dia Útil ---
        const now = new Date()
        const isTodayBusiness = isBusinessDay(now)

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

        // Se hoje NÃO for dia útil (feriado ou fim de semana), damos o trial até o 2º dia útil
        if (!isTodayBusiness) {
            const secondBusinessDay = getNthBusinessDay(now, 2)
            sessionConfig.subscription_data.trial_end = Math.floor(secondBusinessDay.getTime() / 1000)
            console.log(`Holiday detection: Trial set until ${secondBusinessDay.toISOString()} (2nd business day)`);
        } else {
            console.log('Business day detection: Processing immediate payment.');
        }

        const session = await stripe.checkout.sessions.create(sessionConfig)

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
