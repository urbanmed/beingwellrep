-- Update subscription_plans table to use Razorpay fields instead of Stripe
ALTER TABLE public.subscription_plans 
DROP COLUMN IF EXISTS stripe_price_id_monthly,
DROP COLUMN IF EXISTS stripe_price_id_yearly,
ADD COLUMN razorpay_plan_id_monthly text,
ADD COLUMN razorpay_plan_id_yearly text;

-- Update user_subscriptions table to use Razorpay fields instead of Stripe  
ALTER TABLE public.user_subscriptions
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS stripe_subscription_id,
ADD COLUMN razorpay_customer_id text,
ADD COLUMN razorpay_subscription_id text;

-- Update billing_history table to use Razorpay fields instead of Stripe
ALTER TABLE public.billing_history
DROP COLUMN IF EXISTS stripe_invoice_id,
DROP COLUMN IF EXISTS stripe_payment_intent_id,
ADD COLUMN razorpay_payment_id text,
ADD COLUMN razorpay_order_id text;