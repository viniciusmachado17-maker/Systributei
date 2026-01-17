
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
 * Normaliza e formata o NCM para busca no banco (xxxx.xx.xx)
 */
const formatNCMForDB = (ncm: string): string => {
  const digits = ncm.replace(/\D/g, '').padStart(8, '0');
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
};

/**
 * Calcula a similaridade entre duas strings (0 a 1) usando Levenshtein
 */
const calculateSimilarity = (s1: string, s2: string): number => {
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();

  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const costs = new Array();
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }

  const distance = costs[str2.length];
  const maxLen = Math.max(str1.length, str2.length);
  return (maxLen - distance) / maxLen;
};

/**
 * Calcula a similaridade baseada em palavras (Interseção)
 * Útil para capturar "PAO FRANCES" em "PAO FRANCES MOREIRA"
 */
const calculateWordSimilarity = (s1: string, s2: string): number => {
  const getWords = (s: string) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1); // Ignora conectivos de 1 letra

  const w1 = getWords(s1);
  const w2 = getWords(s2);

  if (w1.length === 0 || w2.length === 0) return 0;

  const intersection = w1.filter(word => w2.includes(word));
  // Score baseado no quanto da menor string está contida na maior
  const score = intersection.length / Math.min(w1.length, w2.length);

  return score;
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

  try {
    // Se for busca por NCM, não usamos o RPC de busca por nome
    if (searchType === 'ncm') {
      const formattedNCM = query.includes('.') ? query : formatNCMForDB(query);

      const { data, error } = await supabase
        .from('products')
        .select('id, produto, ean, ncm, cest')
        .ilike('ncm', `%${formattedNCM}%`)
        .limit(1000);

      if (error) throw error;
      return data || [];
    }

    // Busca por Nome via RPC (ou fallback)
    const { data, error } = await supabase.rpc('search_products_v2', {
      search_term: query,
      limit_val: 1000 // Aumentado para 1000 itens
    });

    if (error) {
      console.error("Erro ao chamar RPC search_products_v2:", error);

      // Fallback para busca tradicional se o RPC falhar
      let queryBuilder = supabase
        .from('products')
        .select('id, produto, ean, ncm, cest');

      const words = query.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0) return [];
      words.forEach(word => {
        queryBuilder = queryBuilder.ilike('produto', `%${word}%`);
      });

      const { data: fallbackData, error: fallbackError } = await queryBuilder.limit(1000);
      if (fallbackError) throw fallbackError;
      return fallbackData || [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      produto: item.produto,
      ean: item.ean,
      ncm: item.ncm,
      cest: item.cest
    }));

  } catch (err) {
    console.error("Erro ao buscar lista de produtos:", err);
    return [];
  }
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
 * Busca o produto por cascata de prioridade dinâmica: 
 * 1. EAN (Exato)
 * 2. Nome (Fuzzie / All Words) - Padrão rigoroso
 * 3. NCM + Nome (Interseção de palavras) - Padrão flexível
 */
export const findProductByCascade = async (ean?: string, ncm?: string, name?: string): Promise<{ product: Product | null, source?: 'EAN' | 'NCM' | 'Nome' }> => {
  if (!isSupabaseConfigured) return { product: null };

  // 1. Tentar por EAN (se válido e não for "SEM GTIN" ou zeros)
  if (ean && ean !== 'SEM GTIN' && ean !== '0' && !/^0+$/.test(ean)) {
    const fromEan = await getProductDetails(ean, 'ean');
    if (fromEan) return { product: fromEan, source: 'EAN' };
  }

  // 2. Se temos Nome, tentamos a busca por palavras total (Rigorosa)
  if (name) {
    const list = await searchProducts(name, 'name');
    if (list.length > 0) {
      let bestMatch: { product: ProductSummary | null, score: number } = { product: null, score: 0 };

      for (const item of list) {
        const score = calculateSimilarity(name, item.produto);
        if (score > bestMatch.score) {
          bestMatch = { product: item, score };
        }
      }

      if (bestMatch.product && bestMatch.score >= 0.8) {
        const fromName = await getProductDetails(bestMatch.product.id, 'id');
        if (fromName) return { product: fromName, source: 'Nome' };
      }
    }
  }

  // 3. Se não achou pelo nome completo ou não achou nada, usamos o NCM como âncora
  // e tentamos uma validação por nome dentro dos produtos do mesmo NCM
  if (ncm) {
    const formattedNCM = formatNCMForDB(ncm);

    // Buscamos todos os produtos com esse NCM (até 500 para análise)
    const { data: ncmProducts, error } = await supabase
      .from('products')
      .select('id, produto, ean, ncm')
      .eq('ncm', formattedNCM)
      .limit(500);

    if (ncmProducts && ncmProducts.length > 0) {
      // Se tivermos o nome do XML, tentamos achar o "irmão" mais parecido
      if (name) {
        let bestSubMatch: { product: any, score: number } = { product: null, score: 0 };

        for (const item of ncmProducts) {
          // Usamos similaridade de palavras para ser mais flexível (ex: extra brand names)
          const wordScore = calculateWordSimilarity(name, item.produto);
          const levScore = calculateSimilarity(name, item.produto);

          // O score final prioriza a interseção mas pondera o Levenshtein
          const finalScore = (wordScore * 0.7) + (levScore * 0.3);

          if (finalScore > bestSubMatch.score) {
            bestSubMatch = { product: item, score: finalScore };
          }
        }

        // Se o score for bom (> 60%), assumimos que é este produto
        if (bestSubMatch.product && bestSubMatch.score >= 0.6) {
          const matched = await getProductDetails(bestSubMatch.product.id, 'id');
          if (matched) return { product: matched, source: 'Nome' };
        }
      }

      // 4. Fallback: Se não teve match de nome bom o suficiente, pega o primeiro do NCM mesmo
      const fallbackNcm = await getProductDetails(ncmProducts[0].id, 'id');
      if (fallbackNcm) return { product: fallbackNcm, source: 'NCM' };
    }
  }

  return { product: null };
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

  // Busca por NCM
  if (mode === 'ncm') {
    const formattedNCM = formatNCMForDB(query);
    const { data: ncmData } = await supabase
      .from('products')
      .select('id')
      .eq('ncm', formattedNCM)
      .limit(1)
      .maybeSingle();

    if (ncmData) {
      return getProductDetails(ncmData.id, 'id');
    }
  }

  return null;
}
