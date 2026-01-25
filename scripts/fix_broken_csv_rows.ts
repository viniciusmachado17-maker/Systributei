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

async function fixMissingIBS() {
    console.log("Iniciando reparo de itens FALTANTES no IBS...");

    try {
        // 1. Identificar quais EANs estão faltando no IBS
        console.log("Buscando EANs com IBS null...");
        // Busca paginada
        let missingEans: string[] = [];
        const { data: missingData, error: missingError } = await supabase
            .from('products')
            .select('ean, id')
            .is('ibs.id', null) // Isso não funciona direto com left join implícito na api js do jeito simples
        // Workaround: SQL query raw via rpc ou, dada a limitação, vamos buscar os produtos que falharam antes
        // Ou melhor: Vamos rodar o arquivo CSV novamente FOCADO nas linhas que dão erro de split normal.

        // Abordagem: Ler o CSV e procurar linhas onde o split falhou ou ficou estranho.
        // As linhas problemáticas provavelmente têm ";" no nome do produto.

        const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
        const lines = csvContent.split(/\r?\n/);

        const startIndex = lines[0].startsWith('EAN;') ? 1 : 0;

        let fixedCount = 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Tenta detectar se a linha é "problemática"
            // Uma linha normal tem cerca de 32 colunas separadas por ;
            // Se o nome tem ;, o split vai criar mais colunas OU separar errado.
            // O EAN é sempre o primeiro.
            // O padrão das colunas de impostos é bem fixo no final.

            // Estratégia de recuperação:
            // Sabemos que as últimas 26 colunas são de impostos (aprox).
            // Podemos tentar fazer o parse DE TRÁS PRA FRENTE para pegar os impostos
            // e o que sobrar no meio é o nome/ncm/cest.

            let cols = line.split(';');

            // Se o split deu certo e já processamos, ok.
            // Mas queremos pegar os casos onde o nome quebrou.
            // Vamos checar no banco se esse EAN tem IBS. Se tiver, pula.

            const rawEan = cols[0]?.trim();
            if (!rawEan) continue;

            // Otimização: buscar em batch seria melhor, mas para 54 itens, one-by-one é ok.
            // Primeiro, vamos verificar se as colunas parecem deslocadas.
            // Se cols[2] não parece NCM (ex: tem texto), ou cols[1] parece incompleto.

            const regexNCM = /^[\d\.]+$/;
            // Se cols[2] não for NCM, pode ser que o produto tenha um ; e deslocou tudo.
            // Mas a coluna 2 é NCM.

            // Vamos varrer buscando os EANs problemáticos (que sabemos que estao sem IBS).
            // Vamos tentar 'upsertar' tudo que parece quebrado.

            // Recuperação inteligente:
            // Pegar os últimos 26 tokens como dados de imposto.
            // O token 0 é EAN.
            // Os tokens entre 1 e (length - 26) são Produto + NCM + CEST + Status + Erro.
            // Isso é complexo pois NCM e CEST as vezes são vazios.

            // Simplificação:
            // O CSV parece ter sempre 32 colunas no header.
            // Se line.split(';') > 32, tem ; extra no nome.

            if (cols.length > 32) {
                // console.log(`Linha complexa detectada: ${rawEan}`);

                // Reconstrução
                const ean = cols[0];

                // Os últimos 26 campos são impostos + status finais?
                // Vamos contar do fim para o início.
                // 31: IBS ALQFM Sai
                // ...
                // 6: CBS CST Ent
                // 5: Erro
                // 4: Status
                // 3: CEST
                // 2: NCM
                // 1: Produto (pode ter ;)

                // Total campos esperados: 32.
                const extras = cols.length - 32;

                // Produto vai de cols[1] até cols[1 + extras]
                const produtoReconstruido = cols.slice(1, 1 + extras + 1).join(';');

                // Novos índices virtuais
                const idxNcm = 2 + extras;
                const idxCest = 3 + extras;
                // ... e assim por diante.

                // Mapeando com offset
                const getCol = (originalIndex: number) => {
                    if (originalIndex <= 0) return cols[originalIndex]; // EAN
                    if (originalIndex === 1) return produtoReconstruido;
                    return cols[originalIndex + extras];
                };

                // Agora temos os dados alinhados.
                const ncm = getCol(2);
                /*
                console.log(`Recuperado:`);
                console.log(`EAN: ${ean}`);
                console.log(`Prod: ${produtoReconstruido}`);
                console.log(`NCM: ${ncm}`);
                */

                // Upsert Product com nome corrigido
                const { data: prodData, error: prodError } = await supabase
                    .from('products')
                    .upsert({
                        ean: cleanString(ean),
                        produto: cleanString(produtoReconstruido)?.substring(0, 255),
                        ncm: cleanString(ncm)?.substring(0, 20),
                        cest: cleanString(getCol(3))?.substring(0, 20),
                        status: 'done',
                        processed_at: new Date().toISOString()
                    }, { onConflict: 'ean' })
                    .select('id')
                    .single();

                if (prodError || !prodData) {
                    console.error(`Erro upsert produt ${ean}:`, prodError?.message);
                    continue;
                }

                const pid = prodData.id;

                // Inserir CBS
                // Indices originais: 6 a 15
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

                // Inserir IBS
                // Indices originais: 16 a 31
                const ibsData = {
                    product_id: pid,
                    cst_entrada: cleanString(getCol(16)),
                    cst_saida: cleanString(getCol(17)),
                    cclass_entrada: cleanString(getCol(18)),
                    cclass_saida: cleanString(getCol(19)),

                    // Estadual
                    alqe_ent: cleanPercent(getCol(20)),
                    alqe_sai: cleanPercent(getCol(21)),
                    red_alqe_ent: cleanPercent(getCol(22)),
                    red_alqe_sai: cleanPercent(getCol(23)),
                    alqfe_ent: cleanPercent(getCol(24)),
                    alqfe_sai: cleanPercent(getCol(25)),

                    // Municipal
                    alqm_ent: cleanPercent(getCol(26)),
                    alqm_sai: cleanPercent(getCol(27)),
                    red_alqm_ent: cleanPercent(getCol(28)),
                    red_alqm_sai: cleanPercent(getCol(29)),
                    alqfm_ent: cleanPercent(getCol(30)),
                    alqfm_sai: cleanPercent(getCol(31))
                };

                const { error: ibsError } = await supabase.from('ibs').upsert(ibsData, { onConflict: 'product_id' });

                if (ibsError) console.error(`Erro IBS ${ean}:`, ibsError.message);
                else fixedCount++;
            }
        }

        console.log(`Correção finalizada. Itens recuperados e ajustados: ${fixedCount}`);

    } catch (error) {
        console.error("Erro fatal:", error);
    }
}

fixMissingIBS();
