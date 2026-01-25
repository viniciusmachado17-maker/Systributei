import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Configurações do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Erro: Variáveis de ambiente VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ROLE_KEY) são obrigatórias.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

const CSV_FILE_PATH = "EXPORT_EANS.csv";

// Função auxiliar
const cleanPercent = (value: string | undefined): string | null => {
    if (!value || value === "-" || value === "NaN%") return null;
    return value.replace("%", "").trim();
};

const cleanString = (value: string | undefined): string | null => {
    if (!value || value.trim() === "" || value === "-") return null;
    return value.trim();
}

async function importData() {
    console.log("Iniciando importação MANUAL...");

    try {
        const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
        const lines = csvContent.split(/\r?\n/); // Divide por quebra de linha (CRLF ou LF)

        console.log(`Lidas ${lines.length} linhas do arquivo.`);

        // Mapeamento de índices baseado no header conhecido:
        // 0:EAN; 1:Produto; 2:NCM; 3:CEST; 4:Status; 5:Erro; 
        // 6:CBS CST Ent; 7:CBS CST Sai; 8:CBS CClass Ent; 9:CBS CClass Sai; 
        // 10:CBS ALQ Ent; 11:CBS ALQ Sai; 12:CBS Red Ent; 13:CBS Red Sai; 14:CBS ALQF Ent; 15:CBS ALQF Sai;
        // 16:IBS CST Ent; 17:IBS CST Sai; 18:IBS CClass Ent; 19:IBS CClass Sai;
        // 20:IBS ALQE Ent; 21:IBS ALQE Sai; 22:IBS Red ALQE Ent; 23:IBS Red ALQE Sai;
        // 24:IBS ALQFE Ent; 25:IBS ALQFE Sai; 26:IBS ALQM Ent; 27:IBS ALQM Sai;
        // 28:IBS Red ALQM Ent; 29:IBS Red ALQM Sai; 30:IBS ALQFM Ent; 31:IBS ALQFM Sai

        let processedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        // Pula header (i=1) se a primeira linha for header
        const startIndex = lines[0].startsWith('EAN;') ? 1 : 0;

        const BATCH_SIZE = 50;

        for (let i = startIndex; i < lines.length; i += BATCH_SIZE) {
            const batchLines = lines.slice(i, i + BATCH_SIZE);

            await Promise.all(batchLines.map(async (line) => {
                if (!line.trim()) return; // Pula linha vazia

                const cols = line.split(';');
                if (cols.length < 5) return; // Linha inválida ou quebrada

                const ean = cleanString(cols[0]);

                if (!ean || ean.length > 20) {
                    // console.warn(`EAN inválido na linha: ${ean}`);
                    return;
                }

                try {
                    // 1. Check existência
                    const { data: existingProduct, error: fetchError } = await supabase
                        .from('products')
                        .select('id')
                        .eq('ean', ean)
                        .single();

                    if (fetchError && fetchError.code !== 'PGRST116') {
                        // console.error(`Erro ao buscar ${ean}:`, fetchError.message);
                        errorCount++;
                        return;
                    }

                    if (existingProduct) {
                        skippedCount++;
                        return;
                    }

                    // 2. Inserir Produto
                    const { data: newProduct, error: insertProductError } = await supabase
                        .from('products')
                        .insert({
                            ean: ean,
                            produto: cleanString(cols[1])?.substring(0, 255),
                            ncm: cleanString(cols[2])?.substring(0, 20),
                            cest: cleanString(cols[3])?.substring(0, 20),
                            status: 'done',
                            processed_at: new Date().toISOString()
                        })
                        .select('id')
                        .single();

                    if (insertProductError) {
                        // console.error(`Erro insert produto ${ean}:`, insertProductError.message);
                        errorCount++;
                        return;
                    }

                    const productId = newProduct.id;

                    // 3. CBS
                    const cbsData = {
                        product_id: productId,
                        cst_entrada: cleanString(cols[6]),
                        cst_saida: cleanString(cols[7]),
                        cclass_entrada: cleanString(cols[8]),
                        cclass_saida: cleanString(cols[9]),
                        alq_ent: cleanPercent(cols[10]),
                        alq_sai: cleanPercent(cols[11]),
                        red_alq_ent: cleanPercent(cols[12]),
                        red_alq_sai: cleanPercent(cols[13]),
                        alqf_ent: cleanPercent(cols[14]),
                        alqf_sai: cleanPercent(cols[15])
                    };

                    const { error: insertCbsError } = await supabase.from('cbs').insert(cbsData);
                    if (insertCbsError) console.error(`Erro CBS ${ean}:`, insertCbsError.message);

                    // 4. IBS (Mapeando Estaduais - colunas 20-25 - para banco)
                    const ibsDataDb = {
                        product_id: productId,
                        cst_entrada: cleanString(cols[16]),
                        cst_saida: cleanString(cols[17]),
                        cclass_entrada: cleanString(cols[18]),
                        cclass_saida: cleanString(cols[19]),
                        alq_ent: cleanPercent(cols[20]), // IBS ALQE Entrada
                        alq_sai: cleanPercent(cols[21]), // IBS ALQE Saida
                        red_alq_ent: cleanPercent(cols[22]),
                        red_alq_sai: cleanPercent(cols[23]),
                        alqf_ent: cleanPercent(cols[24]),
                        alqf_sai: cleanPercent(cols[25])
                    };

                    const { error: insertIbsError } = await supabase.from('ibs').insert(ibsDataDb);
                    if (insertIbsError) console.error(`Erro IBS ${ean}:`, insertIbsError.message);

                    processedCount++;

                } catch (err) {
                    // console.error(`Erro processamento ${ean}:`, err);
                    errorCount++;
                }
            }));

            if (i % 2000 === 0 && i > 0) {
                console.log(`Processados ${i} de ${lines.length}...`);
            }
        }

        console.log("Importação concluída!");
        console.log(`Inseridos: ${processedCount}`);
        console.log(`Pulados: ${skippedCount}`);
        console.log(`Erros (aprox): ${errorCount}`);

    } catch (error) {
        console.error("Erro fatal:", error);
    }
}

importData();
