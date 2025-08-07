import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemMetric {
  id: string;
  metric_type: 'database' | 'api' | 'cpu' | 'memory' | 'storage' | 'network';
  metric_name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  details: Record<string, any>;
  recorded_at: string;
}

export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setMetrics((data || []) as SystemMetric[]);
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLatestMetrics = () => {
    const latestMetrics = new Map<string, SystemMetric>();
    metrics.forEach(metric => {
      const key = `${metric.metric_type}-${metric.metric_name}`;
      if (!latestMetrics.has(key) || 
          new Date(metric.recorded_at) > new Date(latestMetrics.get(key)!.recorded_at)) {
        latestMetrics.set(key, metric);
      }
    });
    return Array.from(latestMetrics.values());
  };

  const getMetricsByType = (type: SystemMetric['metric_type']) => {
    return getLatestMetrics().filter(metric => metric.metric_type === type);
  };

  useEffect(() => {
    fetchMetrics();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('system-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_metrics'
        },
        (payload) => {
          setMetrics(prev => [payload.new as SystemMetric, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    metrics,
    loading,
    fetchMetrics,
    getLatestMetrics,
    getMetricsByType,
  };
};