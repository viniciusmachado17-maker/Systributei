import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testIBS() {
    console.log("Testando inserção na tabela IBS...");

    // Pega qualquer produto
    const { data: products } = await supabase.from('products').select('id').limit(1);

    if (!products || products.length === 0) {
        console.log("Nenhum produto encontrado para teste.");
        return;
    }

    const pid = products[0].id;
    console.log(`Usando product_id: ${pid}`);

    // Tenta inserir IBS
    const { data, error } = await supabase.from('ibs').insert({
        product_id: pid,
        alq_ent: '1.0%', // Teste com valor string
        alq_sai: null
    }).select();

    if (error) {
        console.error("Erro na inserção:", error);
    } else {
        console.log("Sucesso:", data);
        // Cleanup?
    }
}

testIBS();
