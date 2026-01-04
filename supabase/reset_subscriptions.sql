-- Reset all organizations to 'gratis' plan
UPDATE organizations
SET 
    plan_type = 'gratis',
    price_id = NULL,
    stripe_subscription_id = NULL,
    subscription_status = 'canceled',
    has_commitment = FALSE,
    usage_limit = 10,
    request_limit = 1,
    email_limit = 1,
    max_users = 1,
    current_period_end = NULL,
    billing_day = NULL;
