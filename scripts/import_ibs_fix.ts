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

async function fixIbs() {
    console.log("Iniciando reparo/importação de IBS...");

    try {
        const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
        const lines = csvContent.split(/\r?\n/);

        // Pula header
        const startIndex = lines[0].startsWith('EAN;') ? 1 : 0;
        const BATCH_SIZE = 50;

        let processedCount = 0;
        let errors = 0;

        for (let i = startIndex; i < lines.length; i += BATCH_SIZE) {
            const batchLines = lines.slice(i, i + BATCH_SIZE);

            await Promise.all(batchLines.map(async (line) => {
                if (!line.trim()) return;
                const cols = line.split(';');
                if (cols.length < 5) return;

                const ean = cleanString(cols[0]);
                if (!ean) return;

                try {
                    // 1. Pega ID do produto
                    const { data: product } = await supabase
                        .from('products')
                        .select('id')
                        .eq('ean', ean)
                        .single();

                    if (!product) {
                        // Produto não existe (falha na importação anterior?) skip
                        return;
                    }

                    // 2. Monta objeto IBS com colunas CORRETAS
                    // Indices do CSV (baseado no header):
                    // 16:IBS CST Ent; 17:IBS CST Sai; 18:IBS CClass Ent; 19:IBS CClass Sai;
                    // 20:IBS ALQE Ent; 21:IBS ALQE Sai; 22:IBS Red ALQE Ent; 23:IBS Red ALQE Sai;
                    // 24:IBS ALQFE Ent; 25:IBS ALQFE Sai; 
                    // 26:IBS ALQM Ent; 27:IBS ALQM Sai; 28:IBS Red ALQM Ent; 29:IBS Red ALQM Sai; 30:IBS ALQFM Ent; 31:IBS ALQFM Sai

                    const ibsData = {
                        product_id: product.id,
                        cst_entrada: cleanString(cols[16]),
                        cst_saida: cleanString(cols[17]),
                        cclass_entrada: cleanString(cols[18]),
                        cclass_saida: cleanString(cols[19]),

                        // Estadual
                        alqe_ent: cleanPercent(cols[20]),
                        alqe_sai: cleanPercent(cols[21]),
                        red_alqe_ent: cleanPercent(cols[22]),
                        red_alqe_sai: cleanPercent(cols[23]),
                        alqfe_ent: cleanPercent(cols[24]),
                        alqfe_sai: cleanPercent(cols[25]),

                        // Municipal
                        alqm_ent: cleanPercent(cols[26]),
                        alqm_sai: cleanPercent(cols[27]),
                        red_alqm_ent: cleanPercent(cols[28]),
                        red_alqm_sai: cleanPercent(cols[29]),
                        alqfm_ent: cleanPercent(cols[30]),
                        alqfm_sai: cleanPercent(cols[31])
                    };

                    // Upsert no IBS (no conflict product_id)
                    const { error: upsertError } = await supabase
                        .from('ibs')
                        .upsert(ibsData, { onConflict: 'product_id' });

                    if (upsertError) {
                        console.error(`Erro IBS Upsert ${ean}:`, upsertError.message);
                        errors++;
                    } else {
                        processedCount++;
                    }

                } catch (err) {
                    console.error(`Erro processamento ${ean}:`, err);
                    errors++;
                }
            }));

            if (i % 2000 === 0 && i > 0) {
                console.log(`Reparados ${processedCount} registros...`);
            }
        }

        console.log("Reparo concluído!");
        console.log(`Sucessos: ${processedCount}`);
        console.log(`Erros: ${errors}`);

    } catch (error) {
        console.error("Erro fatal:", error);
    }
}

fixIbs();
