-- Fix critical security vulnerability in user_subscriptions table
-- Remove the overly permissive "System can manage subscriptions" policy that allows public access

-- Drop the dangerous policy that allows unrestricted access
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.user_subscriptions;

-- Add a proper policy for system operations (service role only)
-- This policy will only apply when using the service role key, not for regular users
CREATE POLICY "Service role can manage subscriptions" ON public.user_subscriptions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add INSERT policy for users to create their own subscriptions
CREATE POLICY "Users can create their own subscription" ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Ensure the table has RLS enabled (it should already be enabled)
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;