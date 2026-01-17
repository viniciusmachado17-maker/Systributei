
export interface TaxDetail {
  cst_saida: string;
  cclass_saida: string;
  alq_sai?: number | string; // Suporte a versões legadas ou diferentes tabelas
  alqe_sai?: number | string; // Nome correto na tabela IBS (conforme print)
  red_alq_sai?: number | string;
  red_alqe_sai?: number | string; // Nome correto na tabela IBS
  alqf_sai?: number | string;
  alqfe_sai?: number | string; // Coluna correta para Alíquota Final
}

export interface Product {
  id?: number;
  produtos: string; // Nome do produto no DB
  ncm: string;
  cest?: string;
  ean: string; // Código de barras no DB
  price: number;
  category: string;
  // Relacionamentos do Supabase
  ibs?: TaxDetail[];
  cbs?: TaxDetail[];
}

export interface TaxBreakdown {
  ibs_val: number;
  cbs_val: number;
  totalNovo: number;
  totalAntigo: number;
  aliquotaIbs: number;
  aliquotaCbs: number;
  reducaoIbs: number;
  reducaoCbs: number;
  aliquotaFinalIbs: number;
  aliquotaFinalCbs: number;
  cst_ibs: string;
  cst_cbs: string;
  cClass_ibs: string;
  cClass_cbs: string;
  isCestaBasica: boolean;
  diferencaPercentual: number;
  // Adicionado para suportar o simulador de cashback
  cashbackEstimado: number;
}

export interface ProductSummary {
  id: number;
  produto: string;
  ean: string;
  ncm: string;
  cest?: string;
}

export type SearchMode = 'barcode' | 'name' | 'ncm';

export interface ProductRequest {
  id?: string;
  organization_id: string;
  user_id: string;
  product_name: string;
  ean?: string;
  ncm?: string;
  observation?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}

export interface XMLProduct {
  cProd: string;
  xProd: string;
  NCM: string;
  cEAN: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  vDesc: number;
  orig: string;
  foundProduct?: Product | null;
  taxes?: TaxBreakdown | null;
  status: 'found' | 'not_found' | 'searching';
  foundBy?: 'EAN' | 'NCM' | 'Nome';
}

export interface XMLAnalysisResult {
  fileName: string;
  date: string;
  totalValue: number;
  products: XMLProduct[];
}