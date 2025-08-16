import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
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
  subscription_plan?: SubscriptionPlan;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setPlans((data as unknown as SubscriptionPlan[]) || []);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    }
  };

  const fetchUserSubscription = async () => {
    if (!user) {
      setSubscription(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSubscription(data as unknown as UserSubscription);
      } else {
        // Create free subscription for new users
        await createFreeSubscription();
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription details",
        variant: "destructive",
      });
    }
  };

  const createFreeSubscription = async () => {
    if (!user) return;

    try {
      // Get free plan
      const { data: freePlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'free')
        .single();

      if (planError) throw planError;

      // Create subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          subscription_plan_id: freePlan.id,
          status: 'active'
        })
        .select(`
          *,
          subscription_plan:subscription_plans(*)
        `)
        .single();

      if (error) throw error;
      setSubscription(data as unknown as UserSubscription);
    } catch (error) {
      console.error('Error creating free subscription:', error);
    }
  };

  const getCurrentPlan = () => {
    return subscription?.subscription_plan as SubscriptionPlan || null;
  };

  const getFeatureLimit = (feature: string): number => {
    const plan = getCurrentPlan();
    if (!plan) return 0;
    
    const limit = plan.features[feature as keyof typeof plan.features];
    return typeof limit === 'number' ? limit : 0;
  };

  const hasFeature = (feature: string): boolean => {
    const plan = getCurrentPlan();
    if (!plan) return false;
    
    const featureValue = plan.features[feature as keyof typeof plan.features];
    return Boolean(featureValue);
  };

  const isSubscriptionActive = () => {
    return subscription?.status === 'active' || subscription?.status === 'trialing';
  };

  const refreshSubscription = async () => {
    setLoading(true);
    await Promise.all([fetchSubscriptionPlans(), fetchUserSubscription()]);
    setLoading(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubscriptionPlans(), fetchUserSubscription()]);
      setLoading(false);
    };

    loadData();
  }, [user]);

  return {
    subscription,
    plans,
    loading,
    getCurrentPlan,
    getFeatureLimit,
    hasFeature,
    isSubscriptionActive,
    refreshSubscription,
  };
};