
import { createClient } from 'npm:@supabase/supabase-js@2.39.8'
import XLSX from 'npm:xlsx'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const { record } = await req.json()
    const jobId = record.id
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Starting Job: ${jobId}`)

    try {
        // 1. Fetch Job
        const { data: job, error: jobErr } = await supabase.from('spreadsheet_jobs').select('*').eq('id', jobId).single()
        if (jobErr || !job) throw new Error("Job not found")
        if (job.status !== 'processing') return new Response("Skipping - not in processing status")

        // 2. Download File
        const { data: fileData, error: dlErr } = await supabase.storage.from('spreadsheets').download(job.input_path)
        if (dlErr) throw dlErr

        const arrayBuffer = await fileData.arrayBuffer()
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const sheetData = XLSX.utils.sheet_to_json(firstSheet) as any[]

        const total = sheetData.length
        const results = []
        const missingItems = []

        let foundCount = 0
        // 3. Process Rows
        for (let i = 0; i < sheetData.length; i++) {
            const row = sheetData[i]
            const ean = String(row[job.ean_column] || '').trim().replace(/\D/g, '')
            const originalName = String(row[job.name_column] || '').trim()

            if (ean && ean.length >= 7) {
                const { data: product } = await supabase.from('products').select('id, produto, ean, ncm, cest').eq('ean', ean).maybeSingle()

                if (product) {
                    foundCount++
                    const { data: ibs } = await supabase.from('ibs').select('*').eq('product_id', product.id).maybeSingle()
                    const { data: cbs } = await supabase.from('cbs').select('*').eq('product_id', product.id).maybeSingle()

                    const parseVal = (v: any) => parseFloat(String(v || '0').replace(',', '.')) || 0
                    const alqIbs = parseVal(ibs?.alqe_sai ?? ibs?.alq_sai ?? 8.8)
                    const alqCbs = parseVal(cbs?.alqe_sai ?? cbs?.alq_sai ?? 17.7)
                    const redIbs = parseVal(ibs?.red_alqe_sai ?? ibs?.red_alq_sai ?? 0)
                    const redCbs = parseVal(cbs?.red_alqe_sai ?? cbs?.red_alq_sai ?? 0)
                    const finalIbs = parseVal(ibs?.alqfe_sai ?? ibs?.alqf_sai ?? (alqIbs * (1 - redIbs / 100)))
                    const finalCbs = parseVal(cbs?.alqfe_sai ?? cbs?.alqf_sai ?? (alqCbs * (1 - redCbs / 100)))

                    results.push({
                        'EAN': product.ean,
                        'PRODUTO': product.produto,
                        'NCM': product.ncm,
                        'CEST': product.cest || '',
                        'CST IBS': ibs?.cst_saida || '000',
                        'CST CBS': cbs?.cst_saida || '000',
                        'CCLASSTRIB': ibs?.cclass_saida || cbs?.cclass_saida || '',
                        'CBS ALQ': alqCbs.toFixed(2) + '%',
                        'CBS RED': redCbs.toFixed(2) + '%',
                        'CBS FINAL': finalCbs.toFixed(2) + '%',
                        'IBS ALQ': alqIbs.toFixed(2) + '%',
                        'IBS RED': redIbs.toFixed(2) + '%',
                        'IBS FINAL': finalIbs.toFixed(2) + '%'
                    })
                } else {
                    results.push({
                        'EAN': ean, 'PRODUTO': originalName, 'NCM': '', 'CEST': '', 'CST IBS': '', 'CST CBS': '',
                        'CCLASSTRIB': '', 'CBS ALQ': '', 'CBS RED': '', 'CBS FINAL': '', 'IBS ALQ': '', 'IBS RED': '', 'IBS FINAL': ''
                    })
                    missingItems.push({ ean, product_name: originalName, user_id: job.user_id, organization_id: job.organization_id })
                }
            }

            if (i % 50 === 0 || i === total - 1) {
                // During processing, progress is still "work progress"
                await supabase.from('spreadsheet_jobs').update({ progress: Math.round(((i + 1) / total) * 100) }).eq('id', jobId)
            }
        }

        if (missingItems.length > 0) {
            // Check for existing EANs in this org to avoid duplicates
            const { data: existing } = await supabase
                .from('missing_products')
                .select('ean')
                .eq('organization_id', job.organization_id)

            const existingEans = new Set(existing?.map(e => e.ean) || [])
            const uniqueToInsert = missingItems.filter(item => !existingEans.has(item.ean))

            // Use a local Set to handle duplicates WITHIN the current spreadsheet itself
            const finalItems = []
            const seenThisBatch = new Set()
            for (const item of uniqueToInsert) {
                if (!seenThisBatch.has(item.ean)) {
                    finalItems.push(item)
                    seenThisBatch.add(item.ean)
                }
            }

            if (finalItems.length > 0) {
                await supabase.from('missing_products').insert(finalItems)
            }
        }

        // 5. Generate Output
        const newWs = XLSX.utils.json_to_sheet(results)
        const newWb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(newWb, newWs, 'Result')
        const outData = XLSX.write(newWb, { type: 'buffer', bookType: 'xlsx' })

        const outputPath = `${job.user_id}/${Date.now()}_result.xlsx`

        const { error: upErr } = await supabase.storage.from('spreadsheets').upload(outputPath, outData, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: true
        })
        if (upErr) throw upErr

        // 6. Complete Job (Set to pending_admin for review)
        // Here we store the "Assertion Rate" in the progress column
        const foundRate = Math.round((foundCount / total) * 100)
        await supabase.from('spreadsheet_jobs').update({
            status: 'pending_admin',
            progress: foundRate,
            output_path: outputPath
        }).eq('id', jobId)

        console.log(`Job ${jobId} ready for Admin Review`)

        return new Response("Done")

    } catch (err: any) {
        console.error(err)
        await supabase.from('spreadsheet_jobs').update({ status: 'failed', error_message: err.message }).eq('id', jobId)
        return new Response("Failed")
    }
})
