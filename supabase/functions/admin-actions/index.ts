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

        if (userError || !user) {
            console.error("User Auth Error:", userError?.message);
            throw new Error('Invalid Token');
        }

        console.log("Authenticated User ID:", user.id);

        // 3. Verificar Role Admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        console.log("User Profile Role:", profile?.role);

        if (profile?.role !== 'admin') {
            console.warn("Access Denied: Role is", profile?.role);
            return new Response(JSON.stringify({ error: `Unauthorized: User is ${profile?.role}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        // 4. Processar Ação
        const body = await req.json()
        const { action, payload } = body
        console.log("Admin Action:", action, "Payload:", JSON.stringify(payload));

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

        } else if (action === 'list_spreadsheet_jobs') {
            console.log("Fetching spreadsheet jobs with clean joins...");
            const { data: jobs, error } = await supabase
                .from('spreadsheet_jobs')
                .select(`
                    id,
                    filename,
                    status,
                    progress,
                    input_path,
                    output_path,
                    is_paid,
                    created_at,
                    downloaded_at,
                    profiles:profiles!spreadsheet_jobs_profiles_fkey (email, name),
                    organizations:organizations!spreadsheet_jobs_organization_id_fkey (name)
                `)
                .eq('is_paid', true)
                .order('created_at', { ascending: false })

            if (error) {
                console.error("Query Error:", JSON.stringify(error));
                throw new Error("Query failed: " + error.message);
            }
            console.log("Jobs found:", jobs?.length);
            result = jobs;

        } else if (action === 'approve_spreadsheet_job') {
            const { jobId, finalOutputPath } = payload;

            // 1. Get job details
            const { data: job } = await supabase.from('spreadsheet_jobs').select('*').eq('id', jobId).single();
            if (!job) throw new Error("Job not found");

            // 2. Update status and output path
            const updateData: any = {
                status: 'completed',
                completed_at: new Date().toISOString()
            };
            if (finalOutputPath) updateData.output_path = finalOutputPath;

            const { error: updateErr } = await supabase.from('spreadsheet_jobs').update(updateData).eq('id', jobId);
            if (updateErr) throw updateErr;

            // 3. Send Email Notification
            try {
                const { data: userData, error: userFetchErr } = await supabase.auth.admin.getUserById(job.user_id)
                if (userFetchErr) console.error("User Fetch Error:", userFetchErr);

                const userEmail = userData?.user?.email
                const resendKey = Deno.env.get('RESEND_API_KEY')

                console.log("Attempting email to:", userEmail, "with key:", resendKey ? "PRESENT" : "MISSING");

                if (resendKey && userEmail) {
                    console.log(`Sending email to ${userEmail} using domain tributeiclass.com.br`);
                    const emailRes = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${resendKey}`
                        },
                        body: JSON.stringify({
                            from: 'TributeiClass <nao-responda@tributeiclass.com.br>',
                            to: userEmail,
                            subject: `✅ Planilha Pronta para Download: ${job.filename}`,
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                                    <div style="background-color: #0f172a; padding: 32px 20px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Tributei<span style="color: #3b82f6;">Class</span></h1>
                                    </div>
                                    <div style="padding: 40px 30px; text-align: center;">
                                        <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">Sua planilha foi liberada!</h2>
                                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                                            O administrador revisou e liberou o processamento do arquivo <strong>${job.filename}</strong>.
                                        </p>
                                        <a href="https://tributeiclass.com.br" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 16px 40px; border-radius: 12px; font-weight: 700; text-decoration: none;">
                                            Abrir Sistema
                                        </a>
                                    </div>
                                </div>
                            `
                        })
                    })
                    const resJson = await emailRes.json();
                    console.log(`Resend Status: ${emailRes.status}`);
                    console.log("Resend Body:", JSON.stringify(resJson));
                } else {
                    console.warn(`Email not sent. Key: ${resendKey ? "YES" : "NO"}, UserEmail: ${userEmail}`);
                }
            } catch (err) {
                console.error("Resend API Exception:", err);
            }

            result = { success: true };
        } else {
            throw new Error('Action not found')
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Function Error:", error.message)
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