export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  razorpay_plan_id_monthly: string | null;
  razorpay_plan_id_yearly: string | null;
  features: {
    documents_per_month: number;
    ai_queries_per_month: number;
    storage_mb: number;
    family_members: number;
    export_formats: string[];
    priority_support: boolean;
    advanced_analytics: boolean;
  };
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  subscription_plan_id: string;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'trialing';
  trial_end_date: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  subscription_plan?: SubscriptionPlan;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  usage_type: 'documents_processed' | 'ai_queries' | 'storage_mb' | 'reports_generated';
  usage_count: number;
  period_start: string;
  period_end: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BillingHistory {
  id: string;
  user_id: string;
  subscription_plan_id: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  billing_period_start: string | null;
  billing_period_end: string | null;
  invoice_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanName = 'free' | 'basic' | 'premium' | 'enterprise';

export interface PlanFeatures {
  documents_per_month: number;
  ai_queries_per_month: number;
  storage_mb: number;
  family_members: number;
  export_formats: string[];
  priority_support: boolean;
  advanced_analytics: boolean;
}