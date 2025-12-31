export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            cbs: {
                Row: {
                    alq_ent: string | null
                    alq_sai: string | null
                    alqf_ent: string | null
                    alqf_sai: string | null
                    cclass_entrada: string | null
                    cclass_saida: string | null
                    cst_entrada: string | null
                    cst_saida: string | null
                    id: number
                    product_id: number | null
                    red_alq_ent: string | null
                    red_alq_sai: string | null
                }
                Insert: {
                    alq_ent?: string | null
                    alq_sai?: string | null
                    alqf_ent?: string | null
                    alqf_sai?: string | null
                    cclass_entrada?: string | null
                    cclass_saida?: string | null
                    cst_entrada?: string | null
                    cst_saida?: string | null
                    id?: number
                    product_id?: number | null
                    red_alq_ent?: string | null
                    red_alq_sai?: string | null
                }
                Update: {
                    alq_ent?: string | null
                    alq_sai?: string | null
                    alqf_ent?: string | null
                    alqf_sai?: string | null
                    cclass_entrada?: string | null
                    cclass_saida?: string | null
                    cst_entrada?: string | null
                    cst_saida?: string | null
                    id?: number
                    product_id?: number | null
                    red_alq_ent?: string | null
                    red_alq_sai?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "cbs_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: true
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            ibs: {
                Row: {
                    alq_ent: string | null
                    alq_sai: string | null
                    alqf_ent: string | null
                    alqf_sai: string | null
                    cclass_entrada: string | null
                    cclass_saida: string | null
                    cst_entrada: string | null
                    cst_saida: string | null
                    id: number
                    product_id: number | null
                    red_alq_ent: string | null
                    red_alq_sai: string | null
                }
                Insert: {
                    alq_ent?: string | null
                    alq_sai?: string | null
                    alqf_ent?: string | null
                    alqf_sai?: string | null
                    cclass_entrada?: string | null
                    cclass_saida?: string | null
                    cst_entrada?: string | null
                    cst_saida?: string | null
                    id?: number
                    product_id?: number | null
                    red_alq_ent?: string | null
                    red_alq_sai?: string | null
                }
                Update: {
                    alq_ent?: string | null
                    alq_sai?: string | null
                    alqf_ent?: string | null
                    alqf_sai?: string | null
                    cclass_entrada?: string | null
                    cclass_saida?: string | null
                    cst_entrada?: string | null
                    cst_saida?: string | null
                    id?: number
                    product_id?: number | null
                    red_alq_ent?: string | null
                    red_alq_sai?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "ibs_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: true
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            organizations: {
                Row: {
                    created_at: string
                    id: string
                    max_users: number
                    name: string
                    plan_type: string
                    request_count: number
                    request_limit: number
                    trial_ends_at: string | null
                    usage_count: number
                    usage_limit: number
                    subscription_status: string | null
                    stripe_customer_id: string | null
                    stripe_subscription_id: string | null
                    price_id: string | null
                    current_period_end: string | null
                    has_commitment: boolean | null
                }
                Insert: {
                    created_at?: string
                    id?: string
                    max_users?: number
                    name: string
                    plan_type?: string
                    request_count?: number
                    request_limit?: number
                    trial_ends_at?: string | null
                    usage_count?: number
                    usage_limit?: number
                    subscription_status?: string | null
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    price_id?: string | null
                    current_period_end?: string | null
                    has_commitment?: boolean | null
                }
                Update: {
                    created_at?: string
                    id?: string
                    max_users?: number
                    name?: string
                    plan_type?: string
                    request_count?: number
                    request_limit?: number
                    trial_ends_at?: string | null
                    usage_count?: number
                    usage_limit?: number
                    subscription_status?: string | null
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    price_id?: string | null
                    current_period_end?: string | null
                    has_commitment?: boolean | null
                }
                Relationships: []
            }
            products: {
                Row: {
                    cest: string | null
                    created_at: string | null
                    ean: string
                    id: number
                    last_error: string | null
                    ncm: string | null
                    processed_at: string | null
                    produto: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    cest?: string | null
                    created_at?: string | null
                    ean: string
                    id?: number
                    last_error?: string | null
                    ncm?: string | null
                    processed_at?: string | null
                    produto?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    cest?: string | null
                    created_at?: string | null
                    ean?: string
                    id?: number
                    last_error?: string | null
                    ncm?: string | null
                    processed_at?: string | null
                    produto?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    created_at: string
                    email: string | null
                    id: string
                    name: string | null
                    organization_id: string
                    role: string | null
                }
                Insert: {
                    created_at?: string
                    email?: string | null
                    id: string
                    name?: string | null
                    organization_id: string
                    role?: string | null
                }
                Update: {
                    created_at?: string
                    email?: string | null
                    id?: string
                    name?: string | null
                    organization_id?: string
                    role?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
