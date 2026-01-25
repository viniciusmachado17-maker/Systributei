# PRD - TributeiClass (Consultoria IBS e CBS)

## 1. Visão Geral do Produto

**Nome do Produto:** TributeiClass (Consulta IBS e CBS)
**Versão:** 1.0 (MVP em Desenvolvimento)

### 1.1. Objetivo
O **TributeiClass** é uma plataforma SaaS (Software as a Service) projetada para auxiliar varejistas, contadores e analistas fiscais na transição e conformidade com a Reforma Tributária brasileira (especificamente IBS e CBS). A ferramenta permite a consulta rápida e assertiva da tributação de produtos (via EAN, NCM ou descrição), oferecendo insights claros sobre o impacto financeiro (comparativo entre sistema antigo e novo), identificação de benefícios fiscais (Cesta Básica, Cashback) e otimização tributária.

### 1.2. Proposta de Valor
- **Clareza na Reforma Tributária:** Traduz a complexidade da legislação (LC 214/2025, etc.) em informações acionáveis para o lojista.
- **Consultas Multi-canal:** Permite busca por Código de Barras (EAN), NCM, Nome ou até foto do produto (Gemini AI Vision).
- **Inteligência Artificial:** Utiliza IA Generativa (Google Gemini) para explicar regras fiscais em linguagem simples, focada no negócio.
- **Simulação Financeira:** Calcula e compara a carga tributária atual vs. nova, destacando impactos no fluxo de caixa e preço final.

## 2. Personas (Público-Alvo)

1.  **O Lojista/Varejista (Pequeno e Médio):** 
    -   *Dores:* Não entende a reforma tributária, tem medo de pagar imposto errado ou perder competitividade no preço.
    -   *Necessidade:* Respostas rápidas e simples ("Quanto vou pagar?", "Esse produto é Cesta Básica?").
2.  **O Analista Fiscal/Contador:**
    -   *Dores:* Volume massivo de classificações para revisar, falta de ferramentas atualizadas com as novas alíquotas de IBS/CBS.
    -   *Necessidade:* Precisão técnica (CST, cClass), consulta em lote e confiabilidade nos dados.
3.  **Gestor Financeiro:**
    -   *Necessidade:* Previsibilidade de custos e simulação de cenários de precificação.

## 3. Requisitos Funcionais

### 3.1. Autenticação e Gestão de Contas (Supabase Auth)
-   **Cadastro (Signup):** Criação de conta com Nome, Email, Senha e Nome da Empresa.
-   **Login:** Acesso seguro via Email/Senha.
-   **Recuperação de Senha:** Fluxo completo de "Esqueceu a Senha" com link por email.
-   **Perfil de Usuário:** Gestão de dados pessoais e associação com Organização.
-   **Níveis de Acesso (Roles):** `admin` (superusuário) e `user` (cliente).

### 3.2. Assinaturas e Pagamentos (Stripe)
-   **Planos:**
    -   *Gratis/Trial:* Acesso limitado a X consultas.
    -   *Start/Pro/Premium/Enterprise:* Diferentes limites de consultas, usuários e funcionalidades (API, suporte).
-   **Checkout:** Integração com Stripe Checkout para contratação segura.
-   **Portal do Cliente:** Gestão de assinatura (Upgrade, Downgrade, Cancelamento, Histórico de Faturas) - *Em roadmap/parcial*.

### 3.3. Motor de Busca e Classificação (Core)
-   **Busca Flexível:**
    -   *EAN (GTIN):* Busca exata por código de barras.
    -   *NCM:* Busca por Nomenclatura Comum do Mercosul.
    -   *Nome:* Busca textual com algoritmo de similaridade (Fuzzy) e interseção de palavras para encontrar produtos mesmo com descrições "sujas".
-   **Consulta Inteligente (Cascata):**
    -   Prioriza EAN exato.
    -   Se falhar, busca por Nome (alta similaridade).
    -   Se falhar, busca por NCM e valida o nome dentro do grupo (Refinamento).
-   **Scanner de Código de Barras (Vision AI):**
    -   Upload de foto do produto.
    -   Extração automática do código de barras via Google Gemini Vision.

### 3.4. Motor de Cálculo Tributário (Tax Service)
-   **Cálculo IBS e CBS:**
    -   Aplicação de alíquotas padrão (IBS: ~8.8%, CBS: ~17.7% - base configurável).
    -   Identificação de **Reduções** na Alíquota (ex: Cesta Básica, Saúde).
    -   Consideração de **Split Payment** (CST de Saída).
-   **Simulador Comparativo:**
    -   Estimativa do imposto no sistema antigo (ICMS + PIS/COFINS) vs. Novo Sistema.
    -   Cálculo da diferença percentual de carga tributária.
-   **Benefícios:** flag de `isCestaBasica` e cálculo estimado de `Cashback` para o consumidor.

### 3.5. Assistente IA (Gemini Service)
-   **"Insight TributeiClass":**
    -   Gera explicação textual personalizada para cada consulta.
    -   Traduz o tecniquês (CST, Alíquota Ad Rem) para linguagem de negócio ("Isso reduz seu custo", "Aumente a margem").
-   **Explicação de Regras:** Contextualiza reduções ou isenções baseadas na categoria do produto.

### 3.6. Dashboards
-   **Dashboard do Usuário:**
    -   Acesso rápido à busca.
    -   Histórico de consultas recentes.
    -   Resumo do Plano (Consultas restantes).
-   **Dashboard Admin:**
    -   Visão geral de usuários e organizações.
    -   Métricas de uso e assinaturas.
    -   Gestão de produtos/base de dados (Backoffice).

## 4. Requisitos Não-Funcionais

-   **Performance:** Consultas devem retornar em < 2 segundos (exceto quando acionar IA Generativa, que pode levar ~3-5s).
-   **UX/UI:** Interface moderna, responsiva (Mobile-first para uso em chão de loja), limpa e intuitiva. Tema "Premium" (cores sóbrias, glassmorphism).
-   **Segurança:** Dados sensíveis protegidos via RLS (Row Level Security) no Supabase. Pagamentos delegados inteiramente ao Stripe (PCI Compliance).
-   **Disponibilidade:** Arquitetura Serverless (Supabase + Vercel/Netlify) para alta disponibilidade.

## 5. Arquitetura Técnica

### 5.1. Stack Tecnológico
-   **Frontend:** React 19, Vite, TypeScript.
-   **Estilização:** TailwindCSS (Design System customizado).
-   **Backend (BaaS):** Supabase.
    -   *Database:* PostgreSQL.
    -   *Auth:* GoTrue.
    -   *Edge Functions:* Deno (Gerenciamento Stripe Webhooks).
-   **Integrações Externas:**
    -   **Stripe:** Gestão de pagamentos.
    -   **Google Gemini API:** Inteligência Artificial (Texto e Visão).

### 5.2. Estrutura de Dados (Resumo)
-   **Tabelas Principais:**
    -   `products`: Catálogo mestre (ID, EAN, NCM, Descrição, Preço Base).
    -   `ibs` / `cbs`: Tabelas de regras fiscais vinculadas ao produto (Alíquotas, Reduções, CST, cClass).
    -   `organizations` / `profiles`: Dados de clientes.
    -   `history`: Registro de consultas realizadas pelos usuários.

## 6. Fluxos de Usuário Críticos

1.  **Fluxo de Consulta:**
    -   Usuário logado acessa Dashboard -> Digita "Arroz" ou "789..." -> Sistema busca no DB -> TaxService calcula impostos -> GeminiService gera Insight -> UI exibe Card Detalhado.
2.  **Fluxo de Assinatura:**
    -   Landing Page -> Pricing -> Seleciona Plano -> Login/Signup -> Stripe Checkout -> Sucesso -> Retorno ao Dashboard com plano ativo.
3.  **Fluxo de Importação (Futuro/Em Análise):**
    -   Upload de XML de NF-e -> Parsing -> Processamento em Lote -> Relatório de Divergências.

## 7. Roadmap & Melhorias Futuras

-   [ ] **Importação em Lote:** Processamento de arquivos CSV/Excel com milhares de itens.
-   [ ] **API Pública:** Permitir que ERPs integrem o motor de cálculo do TributeiClass.
-   [ ] **Auditoria de Estoque:** Cruzamento do cadastro de produtos do cliente com a base oficial para sanear dados.
-   [ ] **App Nativo:** Versão iOS/Android com foco total no scanner de câmera.
