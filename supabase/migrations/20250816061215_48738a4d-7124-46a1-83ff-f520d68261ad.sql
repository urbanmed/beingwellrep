-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- in cents
  price_yearly INTEGER, -- in cents, null if not available
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  features JSONB NOT NULL DEFAULT '{}', -- feature limits and flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, past_due, unpaid, trialing
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  usage_type TEXT NOT NULL, -- documents_processed, ai_queries, storage_mb, reports_generated
  usage_count INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_type, period_start)
);

-- Create billing history table
CREATE TABLE public.billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- paid, pending, failed, refunded
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Subscription plans policies (public read, admin write)
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- User subscriptions policies
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can manage subscriptions"
ON public.user_subscriptions
FOR ALL
USING (true);

-- Usage tracking policies
CREATE POLICY "Users can view their own usage"
ON public.usage_tracking
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can track usage"
ON public.usage_tracking
FOR ALL
USING (true);

CREATE POLICY "Admins can view all usage"
ON public.usage_tracking
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Billing history policies
CREATE POLICY "Users can view their own billing history"
ON public.billing_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage billing history"
ON public.billing_history
FOR ALL
USING (true);

CREATE POLICY "Admins can view all billing history"
ON public.billing_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_period ON public.usage_tracking(period_start, period_end);
CREATE INDEX idx_billing_history_user_id ON public.billing_history(user_id);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, features, sort_order) VALUES
('free', 'Free', 'Basic health tracking', 0, 0, '{
  "documents_per_month": 5,
  "ai_queries_per_month": 10,
  "storage_mb": 100,
  "family_members": 1,
  "export_formats": ["pdf"],
  "priority_support": false,
  "advanced_analytics": false
}', 1),
('basic', 'Basic', 'Essential health management', 999, 9999, '{
  "documents_per_month": 50,
  "ai_queries_per_month": 100,
  "storage_mb": 1000,
  "family_members": 3,
  "export_formats": ["pdf", "csv"],
  "priority_support": false,
  "advanced_analytics": true
}', 2),
('premium', 'Premium', 'Complete health platform', 1999, 19999, '{
  "documents_per_month": 200,
  "ai_queries_per_month": 500,
  "storage_mb": 5000,
  "family_members": 10,
  "export_formats": ["pdf", "csv", "hl7"],
  "priority_support": true,
  "advanced_analytics": true
}', 3),
('enterprise', 'Enterprise', 'Unlimited health management', 4999, 49999, '{
  "documents_per_month": -1,
  "ai_queries_per_month": -1,
  "storage_mb": -1,
  "family_members": -1,
  "export_formats": ["pdf", "csv", "hl7", "fhir"],
  "priority_support": true,
  "advanced_analytics": true
}', 4);

-- Create trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
BEFORE UPDATE ON public.usage_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_history_updated_at
BEFORE UPDATE ON public.billing_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();