import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { ProductRequest } from '../types';

// Tenta obter as variáveis do ambiente de várias formas comuns
// Tenta obter as variáveis do ambiente (Vite uses import.meta.env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificação se as chaves básicas existem e parecem válidas
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith('https://')
);

if (!isSupabaseConfigured) {
  console.error("ERRO DE CONFIGURAÇÃO SUPABASE:");
  console.info("Para conectar seu banco real, configure as seguintes Environment Variables no arquivo .env.local:");
  console.info("1. VITE_SUPABASE_URL (Pegue em Project Settings > API > Project URL)");
  console.info("2. VITE_SUPABASE_ANON_KEY (Pegue em Project Settings > API > anon public key)");
}

// Inicialização do cliente
export const supabase = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  : (null as any);

/**
 * Incrementa o contador de uso da organização.
 * Retorna true se sucesso, false se erro.
 */
export const incrementUsage = async (organizationId: string): Promise<boolean> => {
  if (!isSupabaseConfigured) return true; // Mock mode allows infinite

  try {
    const { data: org, error: readError } = await supabase
      .from('organizations')
      .select('usage_count, usage_limit, plan_type')
      .eq('id', organizationId)
      .single();

    if (readError || !org) throw readError;

    // Se ilimitado, apenas incrementa sem checar limite (embora o limite no DB deva ser alto)
    const isUnlimited = ['pro', 'premium', 'enterprise'].includes(org.plan_type);

    if (!isUnlimited && org.usage_count >= org.usage_limit) {
      console.warn("Usage limit reached for organization", organizationId);
      return false;
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ usage_count: org.usage_count + 1 })
      .eq('id', organizationId);

    return !updateError;
  } catch (err) {
    console.error("Erro ao incrementar uso:", err);
    return false;
  }
};

/**
 * Função para testar a saúde da conexão e verificar se as tabelas existem
 */
export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured) {
    return { success: false, message: "Variáveis SUPABASE_URL ou SUPABASE_ANON_KEY não encontradas." };
  }
  try {
    // Tenta buscar o primeiro produto apenas para testar a existência da tabela e colunas
    const { data, error } = await supabase
      .from('products')
      .select('produto')
      .limit(1);

    if (error) {
      console.error("Erro de resposta do Supabase:", error);
      return { success: false, message: `Erro na tabela 'products': ${error.message}` };
    }

    return { success: true, message: "Conectado e consumindo dados com sucesso!" };
  } catch (err: any) {
    console.error("Erro crítico ao testar conexão:", err);
    return { success: false, message: "Falha na rede ou URL do Supabase inválida." };
  }
};

/**
 * Incrementa o contador de solicitações da organização.
 */
export const incrementRequestCount = async (organizationId: string): Promise<boolean> => {
  if (!isSupabaseConfigured) return true;

  try {
    const { data: org, error: readError } = await supabase
      .from('organizations')
      .select('request_count, request_limit')
      .eq('id', organizationId)
      .single();

    if (readError || !org) throw readError;

    if (org.request_count >= org.request_limit) {
      console.warn("Request limit reached for organization", organizationId);
      return false;
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ request_count: org.request_count + 1 })
      .eq('id', organizationId);

    return !updateError;
  } catch (err) {
    console.error("Erro ao incrementar contador de solicitações:", err);
    return false;
  }
};

/**
 * Busca os dados mais recentes de uma organização.
 */
export const getOrganization = async (id: string): Promise<any | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Erro ao buscar organização:", err);
    return null;
  }
};

/**
 * Cria uma nova solicitação de cadastro de produto.
 */
export const createProductRequest = async (request: ProductRequest): Promise<{ success: boolean; message?: string }> => {
  if (!isSupabaseConfigured) {
    return { success: true, message: "Solicitação simulada com sucesso (Modo Mock)." };
  }

  try {
    const { error } = await supabase
      .from('product_requests')
      .insert([{
        organization_id: request.organization_id,
        user_id: request.user_id,
        product_name: request.product_name,
        ean: request.ean,
        ncm: request.ncm,
        observation: request.observation,
        status: 'pending',
        user_seen: true
      }]);

    if (error) throw error;

    const incremented = await incrementRequestCount(request.organization_id);
    if (!incremented) console.warn("Solicitação criada, mas falha ao incrementar contador.");

    return { success: true };
  } catch (err: any) {
    console.error("Erro ao criar solicitação:", err);
    return { success: false, message: err.message || "Erro desconhecido." };
  }
};

/**
 * Incrementa o contador de consultas por e-mail da organização.
 */
export const incrementEmailCount = async (organizationId: string): Promise<boolean> => {
  if (!isSupabaseConfigured) return true;

  try {
    const { data: org, error: readError } = await supabase
      .from('organizations')
      .select('email_count, email_limit')
      .eq('id', organizationId)
      .single();

    if (readError || !org) throw readError;

    if (org.email_count >= org.email_limit) {
      console.warn("Email consultation limit reached:", organizationId);
      return false;
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ email_count: org.email_count + 1 })
      .eq('id', organizationId);

    return !updateError;
  } catch (err) {
    console.error("Erro ao incrementar contador de e-mail:", err);
    return false;
  }
};

/**
 * Envia uma consulta por e-mail (salva no banco).
 */
export const sendEmailConsultation = async (consultation: {
  organization_id: string;
  user_id: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; message?: string }> => {
  if (!isSupabaseConfigured) {
    return { success: true, message: "Consulta enviada com sucesso (Simulado)." };
  }

  try {
    // 1. Tenta incrementar o contador primeiro para garantir o limite
    const incremented = await incrementEmailCount(consultation.organization_id);

    if (!incremented) {
      return {
        success: false,
        message: "Limite de consultas atingido para o seu plano. Por favor, faça um upgrade."
      };
    }

    // 2. Se incrementou com sucesso, insere a consulta
    const { error } = await supabase
      .from('email_consultations')
      .insert([{ ...consultation, user_seen: true }]);

    if (error) {
      // Opcional: Reverter o incremento se a inserção falhar
      // Mas falhas de inserção aqui são raras se o auth passar
      throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error("Erro ao enviar consulta por e-mail:", err);
    return { success: false, message: err.message || "Erro ao processar sua dúvida." };
  }
};

/**
 * Busca todas as consultas de e-mail (Apenas para Admins via RLS).
 */
export const getAllConsultations = async (): Promise<any[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('email_consultations')
      .select(`
        *,
        organizations:organization_id (name),
        profiles:user_id (name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro Supabase:", error);
      // Tentativa de fallback sem joins se houver erro de RLS nos joins
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('email_consultations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      return fallbackData || [];
    }
    return data || [];
  } catch (err) {
    console.error("Erro ao buscar consultas:", err);
    return [];
  }
};

/**
 * Busca as consultas de uma organização específica (Para usuários comuns).
 */
export const getUserConsultations = async (organizationId: string): Promise<any[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('email_consultations')
      .select(`
        *,
        organizations:organization_id (name),
        profiles:user_id (name, email)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar consultas:", error);
      // Fallback sem joins
      const { data: fallbackData } = await supabase
        .from('email_consultations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      return fallbackData || [];
    }
    return data || [];
  } catch (err) {
    console.error("Erro ao buscar consultas do usuário:", err);
    return [];
  }
};

/**
 * Atualiza o status e a resposta de uma consulta.
 */
export const updateConsultationStatus = async (
  id: string,
  status: 'pending' | 'replied' | 'clarification',
  answer?: string,
  userReply?: string,
  clarificationRequest?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured) return true;
  try {
    const updateData: any = { status };
    if (answer !== undefined) updateData.answer = answer;
    if (userReply !== undefined) {
      updateData.user_reply = userReply;
      updateData.status = 'pending'; // Volta para pendente quando o usuário responde
    }
    if (clarificationRequest !== undefined) {
      updateData.clarification_request = clarificationRequest;
    }

    updateData.updated_at = new Date().toISOString();

    // Se a ação for do admin (replied ou clarification), marca como não visto pelo usuário
    if (status === 'replied' || status === 'clarification') {
      updateData.user_seen = false;
    } else if (userReply !== undefined) {
      // Se o usuário está respondendo, ele obviamente já viu a solicitação anterior
      updateData.user_seen = true;
    }

    const { error } = await supabase
      .from('email_consultations')
      .update(updateData)
      .eq('id', id);

    return !error;
  } catch (err) {
  }
};

/**
 * Busca todas as solicitações de cadastro de produto (Apenas para Admins).
 */
export const getProductRequests = async (): Promise<any[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('product_requests')
      .select(`
        *,
        organizations:organization_id (name),
        profiles:user_id (name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro Supabase Requests:", error);
      // Fallback
      const { data: fallbackData } = await supabase
        .from('product_requests')
        .select('*')
        .order('created_at', { ascending: false });
      return fallbackData || [];
    }
    return data || [];
  } catch (err) {
    console.error("Erro ao buscar solicitações:", err);
    return [];
  }
};

/**
 * Atualiza o status de uma solicitação de produto.
 */
export const updateProductRequestStatus = async (
  id: string,
  status: 'pending' | 'completed' | 'rejected'
): Promise<boolean> => {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from('product_requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
        user_seen: false // Admin atualizou, usuário precisa ser notificado
      })
      .eq('id', id);

    if (error) {
      console.error("Erro Supabase Update Request:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Erro ao atualizar solicitação:", err);
    return false;
  }
};

/**
 * Busca as solicitações de um usuário específico.
 */
export const getUserProductRequests = async (userId: string): Promise<any[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('product_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar solicitações do usuário:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Erro ao buscar solicitações do usuário:", err);
    return [];
  }
};

/**
 * Salva um item no histórico de buscas do banco de dados.
 */
export const saveSearchHistory = async (userId: string, orgId: string, productData: any): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    // Inserir novo registro
    await supabase.from('search_history').insert({
      user_id: userId,
      organization_id: orgId,
      product_data: productData
    });

    // Manter apenas os últimos 20 registros
    const { data: history } = await supabase
      .from('search_history')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (history && history.length > 20) {
      const idsToDelete = history.slice(20).map(item => item.id);
      await supabase.from('search_history').delete().in('id', idsToDelete);
    }
  } catch (err) {
    console.error("Erro ao salvar histórico:", err);
  }
};

/**
 * Busca o histórico de buscas do usuário.
 */
export const getSearchHistory = async (userId: string): Promise<any[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar histórico do banco:", error);
      return [];
    }

    // Extraímos apenas o product_data que é o formato esperado pelo front
    return (data || []).map(item => item.product_data);
  } catch (err) {
    console.error("Erro ao buscar histórico:", err);
    return [];
  }
};

/**
 * Limpa todo o histórico do usuário.
 */
export const clearUserSearchHistory = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId);
    return !error;
  } catch (err) {
    console.error("Erro ao limpar histórico:", err);
    return false;
  }
};

/**
 * Cria uma nova solicitação de demonstração.
 */
export const createDemoRequest = async (demoData: { name: string; phone: string; email: string }) => {
  if (!isSupabaseConfigured) return { success: true }; // Simula sucesso se offline
  try {
    const { error } = await supabase
      .from('demo_requests')
      .insert([demoData]);

    if (error) {
      console.error('Erro ao criar pedido de demonstração:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error('Exceção ao criar pedido de demonstração:', err);
    return { success: false, error: err };
  }
};

/**
 * Busca todas as solicitações de demonstração.
 */
export const getDemoRequests = async () => {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar pedidos de demonstração:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exceção ao buscar pedidos de demonstração:', err);
    return [];
  }
};

/**
 * Atualiza o status de uma solicitação de demonstração.
 */
export const updateDemoRequestStatus = async (id: string, status: string) => {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from('demo_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar status do pedido de demonstração:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exceção ao atualizar status do pedido de demonstração:', err);
    return false;
  }
};

/**
 * Chama a Edge Function para criar uma sessão de checkout no Stripe.
 */
export const createCheckoutSession = async (params: {
  priceId: string;
  orgId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}) => {
  if (!isSupabaseConfigured) return { url: '#' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // @ts-ignore - Acessando a chave anon interna do cliente para garantir o envio
    const anonKey = supabase.supabaseKey;

    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: params,
      headers: {
        Authorization: `Bearer ${token}`,
        'apikey': anonKey
      }
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Erro ao criar sessão de checkout:', err);
    throw err;
  }
};

/**
 * Marca todas as solicitações de produto de um usuário como vistas.
 */
export const markRequestsAsSeen = async (userId: string): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('product_requests')
      .update({ user_seen: true })
      .eq('user_id', userId)
      .eq('user_seen', false);
  } catch (err) {
    console.error("Erro ao marcar pedidos como vistos:", err);
  }
};

/**
 * Marca todas as consultas de e-mail de um usuário como vistas.
 */
export const markConsultationsAsSeen = async (userId: string): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('email_consultations')
      .update({ user_seen: true })
      .eq('user_id', userId)
      .eq('user_seen', false);
  } catch (err) {
    console.error("Erro ao marcar consultas como vistas:", err);
  }
};
