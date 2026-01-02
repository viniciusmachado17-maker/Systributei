
import { Product, TaxBreakdown, ProductSummary } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { MOCK_PRODUCTS } from '../constants';

/**
 * Helper para converter valores que podem vir como string/number do banco para number
 * Ex: "18,5" -> 18.5
 */
const parseNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  // Se for string, substitui vírgula por ponto, remove % e converte
  const cleaned = value.toString().replace('%', '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
};

/**
 * Realiza os cálculos baseados nos dados brutos das tabelas ibs e cbs
 */
export const calculateTaxes = (product: Product, isCashback: boolean = false): TaxBreakdown => {
  // Pega o primeiro registro de cada tabela relacionada (Join result)
  const ibsData = product.ibs && product.ibs.length > 0 ? product.ibs[0] : null;
  const cbsData = product.cbs && product.cbs.length > 0 ? product.cbs[0] : null;

  // Alíquotas e Reduções vindas do banco (convertendo de string para number se necessário)
  // Prioriza colunas terminadas em _sai ou alqe_sai conforme o banco
  const alqIbs = ibsData ? parseNumber(ibsData.alqe_sai ?? ibsData.alq_sai) : 8.8;
  const alqCbs = cbsData ? parseNumber(cbsData.alqe_sai ?? cbsData.alq_sai) : 17.7;
  const redIbs = ibsData ? parseNumber(ibsData.red_alqe_sai ?? ibsData.red_alq_sai) : 0;
  const redCbs = cbsData ? parseNumber(cbsData.red_alqe_sai ?? cbsData.red_alq_sai) : 0;

  // Garantir que temos um preço para o cálculo (se a coluna price não existir no DB, usamos 100 como base de simulação)
  const basePrice = (product as any).price || 100;

  const ibs_val = basePrice * ((alqIbs / 100) * (1 - redIbs / 100));
  const cbs_val = basePrice * ((alqCbs / 100) * (1 - redCbs / 100));

  const totalNovo = ibs_val + cbs_val;

  // Simulação comparativa (ICMS Médio de 18% + PIS/COFINS de 9.25% para produtos gerais)
  const category = (product as any).category || 'Geral';
  const aliquotaAntiga = category === "Alimento" ? 0.07 : 0.2725;
  const totalAntigo = basePrice * aliquotaAntiga;
  const diferencaPercentual = totalAntigo > 0 ? ((totalNovo - totalAntigo) / totalAntigo) * 100 : 0;

  // Cashback simulado de 20% do imposto pago
  const cashbackEstimado = isCashback ? totalNovo * 0.2 : 0;

  return {
    ibs_val,
    cbs_val,
    totalNovo,
    totalAntigo,
    aliquotaIbs: alqIbs / 100, // Retorna decimal 0.18
    aliquotaCbs: alqCbs / 100, // Retorna decimal 0.17
    // Verifica alqfe_sai (novo) -> alqf_sai (antigo) -> cálculo manual
    aliquotaFinalIbs: ibsData ? parseNumber(ibsData.alqfe_sai ?? ibsData.alqf_sai) / 100 : (ibs_val / basePrice),
    aliquotaFinalCbs: cbsData ? parseNumber(cbsData.alqfe_sai ?? cbsData.alqf_sai) / 100 : (cbs_val / basePrice),
    reducaoIbs: redIbs,
    reducaoCbs: redCbs,
    cst_ibs: ibsData?.cst_saida || "000",
    cst_cbs: cbsData?.cst_saida || "000",
    cClass_ibs: ibsData?.cclass_saida || "01.001.00",
    cClass_cbs: cbsData?.cclass_saida || "01.001.00",
    isCestaBasica: category === "Alimento" || redIbs === 100,
    diferencaPercentual,
    cashbackEstimado
  };
};

// Busca lista de produtos (Resumo) para o primeiro passo
export const searchProducts = async (query: string, searchType: 'name' | 'ncm' = 'name'): Promise<ProductSummary[]> => {
  if (!isSupabaseConfigured) return [];

  let queryBuilder = supabase
    .from('products')
    .select('id, produto, ean, ncm, cest');

  if (searchType === 'ncm') {
    queryBuilder = queryBuilder.ilike('ncm', `%${query}%`);
  } else {
    // Busca inteligente: quebra a query em palavras e busca por TODAS elas
    const words = query.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
      return [];
    }

    // Aplica um filtro ILIKE para cada palavra (AND logic)
    // Isso garante que o produto contenha TODAS as palavras, independente da ordem
    words.forEach(word => {
      queryBuilder = queryBuilder.ilike('produto', `%${word}%`);
    });
  }

  const { data, error } = await queryBuilder.limit(50);

  if (error) {
    console.error("Erro ao buscar lista de produtos:", error);
    return [];
  }

  console.log(`✅ Encontrados ${data?.length || 0} produtos`);
  if (data && data.length > 0) {
    console.log('Primeiros 5 resultados:', data.slice(0, 5).map(p => p.produto));
  }

  return data || [];
};

// Busca detalhes completos de um produto específico (pelo ID ou EAN exato)
export const getProductDetails = async (identifier: string | number, type: 'id' | 'ean' = 'id'): Promise<Product | null> => {
  if (!isSupabaseConfigured) return null;

  try {
    let productQuery = supabase
      .from('products')
      .select('id, produto, ean, ncm, cest')
      .limit(1);

    if (type === 'id') {
      productQuery = productQuery.eq('id', identifier);
    } else {
      productQuery = productQuery.eq('ean', identifier);
    }

    const { data: prodData, error: prodError } = await productQuery.maybeSingle();

    if (prodError) throw prodError;
    if (!prodData) return null;

    const { data: ibsData } = await supabase.from('ibs').select('*').eq('product_id', prodData.id).limit(1);
    const { data: cbsData } = await supabase.from('cbs').select('*').eq('product_id', prodData.id).limit(1);

    return {
      id: prodData.id,
      produtos: prodData.produto,
      ean: prodData.ean,
      ncm: prodData.ncm,
      cest: prodData.cest,
      category: prodData.category || 'Geral',
      price: prodData.price || 100,
      ibs: ibsData || [],
      cbs: cbsData || []
    } as unknown as Product;

  } catch (err) {
    console.error("Erro ao buscar detalhes do produto:", err);
    return null;
  }
};

/**
 * Busca o produto e seus impostos relacionados (Wrapper de compatibilidade)
 */
export const findProduct = async (query: string, mode: 'barcode' | 'name' | 'ncm'): Promise<Product | null> => {
  // Se for barcode, busca direto via getProductDetails
  if (mode === 'barcode') return getProductDetails(query, 'ean');

  // Se for nome, busca lista e pega o primeiro
  if (mode === 'name') {
    const list = await searchProducts(query);
    if (list.length > 0) {
      return getProductDetails(list[0].id, 'id');
    }
  }

  // NCM não temos busca específica de detalhes ainda, talvez fallback para lista?
  // Por enquanto, retorna null se não for barcode ou name
  return null;
}
