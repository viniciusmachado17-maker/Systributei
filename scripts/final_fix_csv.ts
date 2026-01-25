import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

const CSV_FILE_PATH = "EXPORT_EANS.csv";

const cleanPercent = (value: string | undefined): string | null => {
    if (!value || value === "-" || value === "NaN%") return null;
    return value.replace("%", "").trim();
};

const cleanString = (value: string | undefined): string | null => {
    if (!value || value.trim() === "" || value === "-") return null;
    return value.trim();
}

async function finalFix() {
    console.log("Iniciando varredura FINAL de correção...");

    try {
        const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
        const lines = csvContent.split(/\r?\n/);

        // Identificar colunas esperadas: 32 colunas no total p/ linhas corretas
        // Se length > 32, tem ; no nome.
        // Se length == 32, ok.

        // Vamos processar APENAS as linhas que têm mais de 32 colunas (são as quebradas)
        // E garantir que elas sejam salvas corretamente.

        let repairedCount = 0;

        // Skip header
        const startIndex = lines[0].startsWith('EAN;') ? 1 : 0;

        const BATCH_SIZE = 50;

        for (let i = startIndex; i < lines.length; i += BATCH_SIZE) {
            const batchLines = lines.slice(i, i + BATCH_SIZE);

            await Promise.all(batchLines.map(async (line) => {
                if (!line.trim()) return;
                const cols = line.split(';');

                // Só nos interessa quem tem mais colunas, pois são os que quebraram o mapping posicional simples
                if (cols.length <= 32) return;

                // Estratégia de reconstrução (igual ao successful test anterior, mas agora aplicado em massa)

                // 0: EAN
                // 1 ... X: Produto (quebrado)
                // ... FIM - 26 até FIM: Impostos

                const ean = cleanString(cols[0]);
                if (!ean) return;

                // Calcular offset
                const extras = cols.length - 32;

                // Reconstruir nome
                // Do índice 1 até (1 + extras)
                // Ex: Se tem 1 extra (33 cols), nome é cols[1] + ';' + cols[2]
                const produtoFull = cols.slice(1, 1 + extras + 1).join(';');

                // Mapear colunas pelo fim
                const getCol = (baseIndex: number) => {
                    // Se baseIndex > 1, somamos o extra
                    return cols[baseIndex + extras];
                };

                // Indices base (vistos no script anterior):
                // 2: NCM, 3: CEST ... 6: CBS CST ... 16: IBS CST ...

                const ncm = getCol(2);
                const cest = getCol(3);

                // Upsert do Produto CORRETO
                const { data: prodData, error: prodError } = await supabase
                    .from('products')
                    .upsert({
                        ean: ean,
                        produto: cleanString(produtoFull)?.substring(0, 255),
                        ncm: cleanString(ncm)?.substring(0, 20),
                        cest: cleanString(cest)?.substring(0, 20),
                        status: 'done',
                        processed_at: new Date().toISOString()
                    }, { onConflict: 'ean' }) // Importante: sobrescreve/corrige se EAN já existir com nome errado
                    .select('id')
                    .single();

                if (prodError || !prodData) {
                    console.error(`Falha produto ${ean}:`, prodError?.message);
                    return;
                }

                const pid = prodData.id;

                // Agora corrigir os impostos (que antes podem nem ter entrado ou entrado null)
                const cbsData = {
                    product_id: pid,
                    cst_entrada: cleanString(getCol(6)),
                    cst_saida: cleanString(getCol(7)),
                    cclass_entrada: cleanString(getCol(8)),
                    cclass_saida: cleanString(getCol(9)),
                    alq_ent: cleanPercent(getCol(10)),
                    alq_sai: cleanPercent(getCol(11)),
                    red_alq_ent: cleanPercent(getCol(12)),
                    red_alq_sai: cleanPercent(getCol(13)),
                    alqf_ent: cleanPercent(getCol(14)),
                    alqf_sai: cleanPercent(getCol(15))
                };

                await supabase.from('cbs').upsert(cbsData, { onConflict: 'product_id' });

                // IBS (Indices 16 a 31)
                const ibsData = {
                    product_id: pid,
                    cst_entrada: cleanString(getCol(16)),
                    cst_saida: cleanString(getCol(17)),
                    cclass_entrada: cleanString(getCol(18)),
                    cclass_saida: cleanString(getCol(19)),

                    // Mapeamento corrigido (Estadual = colunas 20-25)
                    alqe_ent: cleanPercent(getCol(20)),
                    alqe_sai: cleanPercent(getCol(21)),
                    red_alqe_ent: cleanPercent(getCol(22)),
                    red_alqe_sai: cleanPercent(getCol(23)),
                    alqfe_ent: cleanPercent(getCol(24)),
                    alqfe_sai: cleanPercent(getCol(25)),

                    // Municipal (26-31)
                    alqm_ent: cleanPercent(getCol(26)),
                    alqm_sai: cleanPercent(getCol(27)),
                    red_alqm_ent: cleanPercent(getCol(28)),
                    red_alqm_sai: cleanPercent(getCol(29)),
                    alqfm_ent: cleanPercent(getCol(30)),
                    alqfm_sai: cleanPercent(getCol(31))
                };

                await supabase.from('ibs').upsert(ibsData, { onConflict: 'product_id' });

                repairedCount++;
            }));

            if (i % 2000 === 0 && i > 0) process.stdout.write('.');
        }

        console.log(`\nProcesso finalizado! ${repairedCount} produtos complexos foram corrigidos.`);

        // Cleanup: Remover produtos "quebrados" (EANs que contêm ;)
        console.log("Limpando lixo do banco...");
        await supabase.from('products').delete().ilike('ean', '%;%');

    } catch (error) {
        console.error("Erro fatal:", error);
    }
}

finalFix();
