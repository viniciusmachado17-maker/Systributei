-- Limpar todas as tabelas de uso (mantendo usuários e organizações)
DELETE FROM email_consultations;
DELETE FROM product_requests;
DELETE FROM search_history;
DELETE FROM demo_requests;

-- Zerar os contadores de uso em todas as organizações
UPDATE organizations
SET 
    usage_count = 0,
    request_count = 0,
    email_count = 0;
