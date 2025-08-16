import { supabase } from '@/integrations/supabase/client';
import { UsageType } from '@/hooks/useUsageTracking';

export class QuotaEnforcementError extends Error {
  constructor(message: string, public usageType: UsageType, public limit: number, public current: number) {
    super(message);
    this.name = 'QuotaEnforcementError';
  }
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  current: number;
  usageType: UsageType;
}

export class QuotaEnforcer {
  private static async getCurrentPeriod() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return {
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString()
    };
  }

  private static async getUserSubscription(userId: string) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  private static async getCurrentUsage(userId: string, usageType: UsageType) {
    const { start } = await this.getCurrentPeriod();
    
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('usage_count')
      .eq('user_id', userId)
      .eq('usage_type', usageType)
      .eq('period_start', start)
      .maybeSingle();

    if (error) throw error;
    return data?.usage_count || 0;
  }

  static async checkQuota(userId: string, usageType: UsageType, requestedAmount: number = 1): Promise<QuotaCheckResult> {
    try {
      // Get user subscription and plan
      const subscription = await this.getUserSubscription(userId);
      if (!subscription?.subscription_plan) {
        throw new Error('No active subscription found');
      }

      // Get feature limit from plan
      const features = subscription.subscription_plan.features as any;
      const featureKey = `${usageType.replace('_processed', '').replace('_generated', '')}_per_month`;
      const limit = features[featureKey] || 0;

      // If limit is -1, it means unlimited
      if (limit === -1) {
        return {
          allowed: true,
          remaining: Infinity,
          limit: Infinity,
          current: 0,
          usageType
        };
      }

      // Get current usage
      const currentUsage = await this.getCurrentUsage(userId, usageType);
      const remaining = Math.max(0, limit - currentUsage);
      const allowed = (currentUsage + requestedAmount) <= limit;

      return {
        allowed,
        remaining,
        limit,
        current: currentUsage,
        usageType
      };
    } catch (error) {
      console.error('Error checking quota:', error);
      throw error;
    }
  }

  static async enforceQuota(userId: string, usageType: UsageType, requestedAmount: number = 1): Promise<void> {
    const result = await this.checkQuota(userId, usageType, requestedAmount);
    
    if (!result.allowed) {
      throw new QuotaEnforcementError(
        `Quota exceeded for ${usageType}. Used: ${result.current}, Limit: ${result.limit}, Requested: ${requestedAmount}`,
        usageType,
        result.limit,
        result.current
      );
    }
  }

  static async trackUsageAndEnforce(userId: string, usageType: UsageType, amount: number = 1): Promise<boolean> {
    try {
      // First check if usage is allowed
      await this.enforceQuota(userId, usageType, amount);

      // If allowed, track the usage
      const { start, end } = await this.getCurrentPeriod();
      const currentUsage = await this.getCurrentUsage(userId, usageType);

      const { error } = await supabase
        .from('usage_tracking')
        .upsert({
          user_id: userId,
          usage_type: usageType,
          usage_count: currentUsage + amount,
          period_start: start,
          period_end: end
        }, {
          onConflict: 'user_id,usage_type,period_start'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      if (error instanceof QuotaEnforcementError) {
        throw error;
      }
      console.error('Error tracking usage:', error);
      return false;
    }
  }

  // Middleware function for API routes
  static createQuotaMiddleware(usageType: UsageType, amount: number = 1) {
    return async (userId: string) => {
      await this.enforceQuota(userId, usageType, amount);
    };
  }
}

export default QuotaEnforcer;