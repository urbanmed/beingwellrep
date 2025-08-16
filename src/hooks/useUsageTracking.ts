import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';
import { useToast } from '@/hooks/use-toast';

export type UsageType = 'documents_processed' | 'ai_queries' | 'storage_mb' | 'reports_generated';

export interface UsageData {
  usage_type: UsageType;
  usage_count: number;
  limit: number;
  percentage: number;
  period_start: string;
  period_end: string;
}

export const useUsageTracking = () => {
  const { user } = useAuth();
  const { getFeatureLimit } = useSubscription();
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getCurrentPeriod = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return {
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString()
    };
  };

  const fetchUsage = async () => {
    if (!user) {
      setUsage([]);
      return;
    }

    try {
      const { start, end } = getCurrentPeriod();
      
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_start', start);

      if (error && error.code !== 'PGRST116') throw error;

      // Create usage data for all types
      const usageTypes: UsageType[] = ['documents_processed', 'ai_queries', 'storage_mb', 'reports_generated'];
      const usageData: UsageData[] = usageTypes.map(type => {
        const existingUsage = data?.find(u => u.usage_type === type);
        const limit = getFeatureLimit(`${type.replace('_processed', '').replace('_generated', '')}_per_month`);
        const usageCount = existingUsage?.usage_count || 0;
        
        return {
          usage_type: type,
          usage_count: usageCount,
          limit: limit === -1 ? Infinity : limit,
          percentage: limit === -1 ? 0 : Math.min((usageCount / limit) * 100, 100),
          period_start: start,
          period_end: end
        };
      });

      setUsage(usageData);
    } catch (error) {
      console.error('Error fetching usage:', error);
      toast({
        title: "Error",
        description: "Failed to load usage data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const trackUsage = async (usageType: UsageType, increment: number = 1) => {
    if (!user) return false;

    try {
      const { start, end } = getCurrentPeriod();
      
      // Check current usage and limits
      const currentUsage = usage.find(u => u.usage_type === usageType);
      if (currentUsage && currentUsage.limit !== Infinity) {
        if (currentUsage.usage_count + increment > currentUsage.limit) {
          toast({
            title: "Usage Limit Reached",
            description: `You've reached your monthly limit for ${usageType.replace('_', ' ')}. Please upgrade your plan.`,
            variant: "destructive",
          });
          return false;
        }
      }

      // Upsert usage record
      const { error } = await supabase
        .from('usage_tracking')
        .upsert({
          user_id: user.id,
          usage_type: usageType,
          usage_count: (currentUsage?.usage_count || 0) + increment,
          period_start: start,
          period_end: end
        }, {
          onConflict: 'user_id,usage_type,period_start'
        });

      if (error) throw error;

      // Refresh usage data
      await fetchUsage();
      return true;
    } catch (error) {
      console.error('Error tracking usage:', error);
      toast({
        title: "Error",
        description: "Failed to track usage",
        variant: "destructive",
      });
      return false;
    }
  };

  const canUseFeature = (usageType: UsageType, requiredAmount: number = 1): boolean => {
    const currentUsage = usage.find(u => u.usage_type === usageType);
    if (!currentUsage) return true;
    
    if (currentUsage.limit === Infinity) return true;
    return (currentUsage.usage_count + requiredAmount) <= currentUsage.limit;
  };

  const getRemainingUsage = (usageType: UsageType): number => {
    const currentUsage = usage.find(u => u.usage_type === usageType);
    if (!currentUsage) return 0;
    
    if (currentUsage.limit === Infinity) return Infinity;
    return Math.max(0, currentUsage.limit - currentUsage.usage_count);
  };

  const getUsageByType = (usageType: UsageType): UsageData | undefined => {
    return usage.find(u => u.usage_type === usageType);
  };

  useEffect(() => {
    fetchUsage();
  }, [user, getFeatureLimit]);

  return {
    usage,
    loading,
    trackUsage,
    canUseFeature,
    getRemainingUsage,
    getUsageByType,
    refreshUsage: fetchUsage,
  };
};