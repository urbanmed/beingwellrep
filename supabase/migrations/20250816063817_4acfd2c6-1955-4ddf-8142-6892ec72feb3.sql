-- Update subscription plans with Razorpay plan IDs (placeholder values)
UPDATE subscription_plans 
SET 
  razorpay_plan_id_monthly = CASE 
    WHEN name = 'free' THEN NULL
    WHEN name = 'basic' THEN 'plan_basic_monthly_999'
    WHEN name = 'premium' THEN 'plan_premium_monthly_1999'
    WHEN name = 'enterprise' THEN 'plan_enterprise_monthly_4999'
  END,
  razorpay_plan_id_yearly = CASE 
    WHEN name = 'free' THEN NULL
    WHEN name = 'basic' THEN 'plan_basic_yearly_9999'
    WHEN name = 'premium' THEN 'plan_premium_yearly_19999'
    WHEN name = 'enterprise' THEN 'plan_enterprise_yearly_49999'
  END;