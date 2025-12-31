
import { Product } from './types';

// Ajustando propriedades para bater com a interface Product (name -> produtos, barcode -> ean)
export const MOCK_PRODUCTS: Product[] = [
  { produtos: "Arroz Integral Tio João 1kg", ncm: "1006.30.00", ean: "7891991010212", price: 6.50, category: "Alimento" },
  { produtos: "Feijão Carioca Camil 1kg", ncm: "0713.33.00", ean: "7896004704029", price: 8.90, category: "Alimento" },
  { produtos: "Refrigerante Coca-Cola 2L", ncm: "2202.10.00", ean: "7894900011517", price: 9.50, category: "Bebida Açucarada" },
  { produtos: "Sabonete Dove 90g", ncm: "3401.11.90", ean: "7891150032775", price: 3.20, category: "Higiene" },
  { produtos: "Notebook Dell Inspiron 15", ncm: "8471.30.12", ean: "7891234567890", price: 3500.00, category: "Eletrônico" },
  { produtos: "iPhone 13 128GB", ncm: "8517.13.00", ean: "194253212345", price: 5199.00, category: "Eletrônico" },
  { produtos: "Leite Integral Italac 1L", ncm: "0401.10.00", ean: "7896004743704", price: 5.49, category: "Alimento" },
  { produtos: "Cerveja Skol Pilsen 350ml", ncm: "2203.00.00", ean: "7891991010243", price: 2.99, category: "Bebida Alcoólica" }
];

// Padrão simplificado para demonstração
export const DEFAULT_IBS_RATE = 0.001; // 0.1% simulado
export const DEFAULT_CBS_RATE = 0.009; // 0.9% simulado

export interface PlanLimit {
  usage_limit: number;
  request_limit: number;
  email_limit: number;
  max_users: number;
  hasHistory: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimit> = {
  gratis: {
    usage_limit: 10,
    request_limit: 1,
    email_limit: 1,
    max_users: 1,
    hasHistory: false
  },
  start: {
    usage_limit: 300,
    request_limit: 30,
    email_limit: 5,
    max_users: 1,
    hasHistory: true
  },
  pro: {
    usage_limit: 999999,
    request_limit: 50,
    email_limit: 15,
    max_users: 1,
    hasHistory: true
  },
  premium: {
    usage_limit: 999999,
    request_limit: 100,
    email_limit: 999999,
    max_users: 5,
    hasHistory: true
  },
};