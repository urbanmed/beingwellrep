import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HealthInsight {
  id: string;
  user_id: string;
  insight_type: 'trend' | 'risk' | 'recommendation' | 'milestone';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  confidence_score?: number;
  data_source_ids?: string[];
  insight_data: Record<string, any>;
  action_items?: string[];
  is_dismissed: boolean;
  dismissed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export const useHealthInsights = () => {
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch health insights
  const fetchInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('health_insights')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out expired insights
      const now = new Date();
      const validInsights = ((data as HealthInsight[]) || []).filter(insight => {
        if (!insight.expires_at) return true;
        return new Date(insight.expires_at) > now;
      });

      setInsights(validInsights);
    } catch (error) {
      console.error('Error fetching health insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate new insights
  const generateInsights = async () => {
    try {
      setGenerating(true);
      
      const { error } = await supabase.functions.invoke('generate-health-insights');

      if (error) throw error;

      toast({
        title: "Insight Generation Started",
        description: "We're analyzing your health data to generate new insights.",
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Dismiss insight
  const dismissInsight = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('health_insights')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', insightId);

      if (error) throw error;

      setInsights(prev => prev.filter(insight => insight.id !== insightId));
      
      toast({
        title: "Insight Dismissed",
        description: "The insight has been removed from your dashboard.",
      });
    } catch (error) {
      console.error('Error dismissing insight:', error);
      toast({
        title: "Dismiss Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Get dismissed insights
  const getDismissedInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('health_insights')
        .select('*')
        .eq('is_dismissed', true)
        .order('dismissed_at', { ascending: false });

      if (error) throw error;
      return (data as HealthInsight[]) || [];
    } catch (error) {
      console.error('Error fetching dismissed insights:', error);
      return [];
    }
  };

  // Restore dismissed insight
  const restoreInsight = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('health_insights')
        .update({
          is_dismissed: false,
          dismissed_at: null,
        })
        .eq('id', insightId);

      if (error) throw error;

      toast({
        title: "Insight Restored",
        description: "The insight has been restored to your dashboard.",
      });
      
      // Refresh insights
      fetchInsights();
    } catch (error) {
      console.error('Error restoring insight:', error);
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Delete insight permanently
  const deleteInsight = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('health_insights')
        .delete()
        .eq('id', insightId);

      if (error) throw error;

      setInsights(prev => prev.filter(insight => insight.id !== insightId));
      
      toast({
        title: "Insight Deleted",
        description: "The insight has been permanently removed.",
      });
    } catch (error) {
      console.error('Error deleting insight:', error);
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchInsights();

    const channel = supabase
      .channel('health-insights-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_insights',
        },
        (payload) => {
          const newInsight = payload.new as HealthInsight;
          
          // Only add if not dismissed and not expired
          if (!newInsight.is_dismissed) {
            const now = new Date();
            if (!newInsight.expires_at || new Date(newInsight.expires_at) > now) {
              setInsights(prev => [newInsight, ...prev]);
              
              // Show toast for high-confidence insights
              if (newInsight.confidence_score && newInsight.confidence_score > 0.8) {
                toast({
                  title: "New Health Insight",
                  description: newInsight.title,
                  variant: newInsight.severity === 'critical' ? 'destructive' : 'default',
                });
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'health_insights',
        },
        (payload) => {
          const updatedInsight = payload.new as HealthInsight;
          
          if (updatedInsight.is_dismissed) {
            setInsights(prev => prev.filter(insight => insight.id !== updatedInsight.id));
          } else {
            setInsights(prev => 
              prev.map(insight => 
                insight.id === updatedInsight.id ? updatedInsight : insight
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'health_insights',
        },
        (payload) => {
          setInsights(prev => prev.filter(insight => insight.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Helper functions
  const getInsightsByType = (type: HealthInsight['insight_type']) => {
    return insights.filter(insight => insight.insight_type === type);
  };

  const getInsightsBySeverity = (severity: HealthInsight['severity']) => {
    return insights.filter(insight => insight.severity === severity);
  };

  const getCriticalInsights = () => {
    return insights.filter(insight => insight.severity === 'critical');
  };

  const getHighConfidenceInsights = () => {
    return insights.filter(
      insight => insight.confidence_score && insight.confidence_score > 0.8
    );
  };

  const getInsightsWithActions = () => {
    return insights.filter(
      insight => insight.action_items && insight.action_items.length > 0
    );
  };

  const getInsightStats = () => {
    return {
      total: insights.length,
      trends: getInsightsByType('trend').length,
      risks: getInsightsByType('risk').length,
      recommendations: getInsightsByType('recommendation').length,
      milestones: getInsightsByType('milestone').length,
      critical: getCriticalInsights().length,
      highConfidence: getHighConfidenceInsights().length,
    };
  };

  return {
    insights,
    loading,
    generating,
    generateInsights,
    dismissInsight,
    getDismissedInsights,
    restoreInsight,
    deleteInsight,
    fetchInsights,
    getInsightsByType,
    getInsightsBySeverity,
    getCriticalInsights,
    getHighConfidenceInsights,
    getInsightsWithActions,
    getInsightStats,
  };
};