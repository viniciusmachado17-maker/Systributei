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

async function penteFino() {
    console.log("=== INICIANDO PENTE FINO (54 itens) ===");

    try {
        // 1. Obter lista exata dos EANs faltantes do banco
        // Mas note: o banco pode ter o EAN incompleto ("789...;Prod") se a inserção foi suja.
        // Vamos buscar products sem IBS

        // Paginação manual simples pois sabemos que são poucos (~54)
        // Mas 'is' null não funciona bem em join implicit na lib js.
        // Vamos usar allow RPC ou simplesmente iterar por todos e filtrar na memória é inviável (100k).
        // Melhor: iterar pelo CSV de novo e tentar inserir SÓ OS QUE FALHAM (upsert forçado).
        // Mas a gente já fez isso e deu erro silencioso ou ignorado.

        // Vamos buscar os 54 itens usando raw query via rpc (se existisse) ou filtrando no client.
        // Como não posso criar rpc function facilmente agora, vou tentar pegar pelo menos 1000 itens sem IBS.

        // Alternativa: filtrar ids onde não existe correspondência na tabela ibs.
        const { data: missingProducts, error: listError } = await supabase
            .from('products')
            .select('id, ean, produto')
            .not('ibs', 'not.is', null); // Isso é "tem ibs". Inverso é difficile.

        // Vamos usar a estratégia do script anterior que tentou listar 10 e conseguiu.
        // Vamos listar TODOS os 54 via paginação se preciso.

        // Na verdade, o `scripts/find_missing_lines.ts` já mostrou que os EANs no banco estão "sujos" 
        // com ponto e vírgula!
        // Ex: EAN "7898288821133;ALCOOL FLOPS 1L 92"
        // Isso confirma que o produto foi inserido ERRADO na tabela `products` também.
        // O EAN *deveria* ser só números (ou string limpa), mas está com restos do CSV.

        // AÇÃO MÁGICA:
        // 1. Identificar produtos no banco onde EAN contem ";" ou caracteres não numéricos estranhos.
        // 2. Deletar esses produtos do banco (pois estão errados).
        // 3. Re-importar essas linhas corretamente do CSV (usando a lógica de reconstrução).

        console.log("Buscando produtos defeituosos no banco...");

        // Buscar produtos onde EAN contém ";"
        const { data: dirtyProducts, error: dirtyError } = await supabase
            .from('products')
            .select('id, ean')
            .ilike('ean', '%;%'); // Busca qualquer EAN que tenha ';'

        if (dirtyError) {
            console.error("Erro ao buscar sujeira:", dirtyError);
            return;
        }

        console.log(`Encontrados ${dirtyProducts?.length || 0} produtos com EAN sujo (contendo ';').`);

        if (dirtyProducts && dirtyProducts.length > 0) {
            console.log("Limpando produtos defeituosos...");
            const ids = dirtyProducts.map(p => p.id);

            // Deletar do IBS e CBS primeiro (cascade teoricamente resolve, mas bom garantir)
            // CBS
            await supabase.from('cbs').delete().in('product_id', ids);
            // IBS
            await supabase.from('ibs').delete().in('product_id', ids);
            // Products
            const { error: delError } = await supabase.from('products').delete().in('id', ids);

            if (delError) console.error("Erro ao deletar:", delError);
            else console.log("Produtos sujos removidos com sucesso.");
        }

        // Agora que limpamos, vamos rodar o FINAL FIX de novo para reinserir esses caras corretamente.
        // O script `final_fix_csv.ts` já tem a lógica de "se length > 32, reconstrua".
        // Mas talvez esses produtos sujos tivessem MENOS colunas detectadas ou algo assim?
        // Não, o EAN estava sujo porque o split inicial falhou.

        // Vamos ler o CSV e processar APENAS as linhas que contém esses EANs "base".
        // Como saber quais são? Os EANs sujos tinham o início do EAN correto.
        // Vamos pegar o prefixo dos sujos (antes do ;) e procurar no CSV.

        const dirtyEanPrefixes = dirtyProducts?.map(p => p.ean.split(';')[0]) || [];
        console.log(`Prefixos para reimportar: ${dirtyEanPrefixes.join(', ')}`);

        if (dirtyEanPrefixes.length === 0) {
            console.log("Nenhum EAN sujo encontrado via ';'. Verificando EANs muito longos...");
            // Pode ser que existam outros erros.
            return;
        }

        const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
        const lines = csvContent.split(/\r?\n/);

        let reimportedCount = 0;

        console.log("Reimportando itens corrigidos...");

        for (const line of lines) {
            if (!line.trim()) continue;

            // Verifica se a linha começa com algum dos prefixos
            const matchedPrefix = dirtyEanPrefixes.find(prefix => line.startsWith(prefix));

            if (matchedPrefix) {
                // Se achou, essa é uma linha problemática.
                // Vamos processar com a lógica "smart" (parse reverso / column counting)
                // Lógica duplicada do final_fix_csv.ts, mas garantida de rodar.

                let cols = line.split(';');

                // Reconstrução forçada:
                // Assumimos que o primeiro token é EAN.
                // Assumimos que os ÚLTIMOS 26 tokens são os dados fiscais.
                // Tudo que sobra no meio é o produto + ncm + cest + status

                // Mas NCM e CEST e Status e Erro são fixos (4 colunas).
                // Então: 
                // 0: EAN
                // 1 até (Length - 26 - 1): Produto
                // (Length - 26): ...

                // Refinando a contagem baseada no `final_fix_csv.ts`:
                // Base correta: 32 colunas.
                // Extras = cols.length - 32.

                const extras = cols.length - 32;
                const ean = cols[0]; // Prefixo limpo

                const produtoFull = cols.slice(1, 1 + extras + 1).join(';');

                const getCol = (baseIndex: number) => cols[baseIndex + extras];

                const ncm = getCol(2); // 2 + extras
                const cest = getCol(3);

                // Inserir Produto
                const { data: newProd, error: newProdErr } = await supabase
                    .from('products')
                    .upsert({
                        ean: cleanString(ean),
                        produto: cleanString(produtoFull)?.substring(0, 255),
                        ncm: cleanString(ncm)?.substring(0, 20),
                        cest: cleanString(cest)?.substring(0, 20),
                        status: 'done',
                        processed_at: new Date().toISOString()
                    }, { onConflict: 'ean' })
                    .select('id')
                    .single();

                if (newProdErr || !newProd) {
                    console.error(`Erro re-inserindo ${ean}:`, newProdErr?.message);
                    continue;
                }

                const pid = newProd.id;

                // Inserir IBS e CBS (copiado para brevidade, mas igual aos outros scripts)
                // CBS (6-15)
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

                // IBS (16-31)
                const ibsData = {
                    product_id: pid,
                    cst_entrada: cleanString(getCol(16)),
                    cst_saida: cleanString(getCol(17)),
                    cclass_entrada: cleanString(getCol(18)),
                    cclass_saida: cleanString(getCol(19)),
                    alqe_ent: cleanPercent(getCol(20)),
                    alqe_sai: cleanPercent(getCol(21)),
                    red_alqe_ent: cleanPercent(getCol(22)),
                    red_alqe_sai: cleanPercent(getCol(23)),
                    alqfe_ent: cleanPercent(getCol(24)),
                    alqfe_sai: cleanPercent(getCol(25)),
                    alqm_ent: cleanPercent(getCol(26)),
                    alqm_sai: cleanPercent(getCol(27)),
                    red_alqm_ent: cleanPercent(getCol(28)),
                    red_alqm_sai: cleanPercent(getCol(29)),
                    alqfm_ent: cleanPercent(getCol(30)),
                    alqfm_sai: cleanPercent(getCol(31))
                };

                const { error: ibsErr } = await supabase.from('ibs').upsert(ibsData, { onConflict: 'product_id' });

                if (!ibsErr) {
                    reimportedCount++;
                    console.log(`Recuperado: ${ean} -> ${produtoFull.substring(0, 30)}...`);
                } else {
                    console.error(`Erro IBS ${ean}:`, ibsErr.message);
                    console.error("Dados IBS tentados:", JSON.stringify(ibsData));
                }
            }
        }

        console.log(`\nPente Fino Concluído. Total recuperados: ${reimportedCount}`);

    } catch (error) {
        console.error("Erro fatal:", error);
    }
}

penteFino();
