import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIChatAnalytics {
  totalConversations: number;
  totalMessages: number;
  uniqueUsers: number;
  averageMessagesPerConversation: number;
  todayConversations: number;
  thisWeekConversations: number;
  avgResponseTime: number;
  errorRate: number;
  usageTrends: Array<{
    date: string;
    conversations: number;
    messages: number;
  }>;
  topUsers: Array<{
    user_id: string;
    conversation_count: number;
    message_count: number;
  }>;
  peakUsageHours: Array<{
    hour: number;
    count: number;
  }>;
}

export function useAIChatAnalytics() {
  const [analytics, setAnalytics] = useState<AIChatAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get basic conversation metrics
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Get unique users count
      const { data: uniqueUsersData } = await supabase
        .from('conversations')
        .select('user_id');

      // Get today's conversations
      const today = new Date().toISOString().split('T')[0];
      const { count: todayConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get this week's conversations
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const { count: thisWeekConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      // Get usage trends for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: trendsData } = await supabase
        .from('conversations')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Process trends data
      const usageTrends = trendsData?.reduce((acc: any, conv) => {
        const date = conv.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, conversations: 0, messages: 0 };
        }
        acc[date].conversations += 1;
        return acc;
      }, {}) || {};

      // Get top users by conversation count
      const { data: topUsersData } = await supabase
        .from('conversations')
        .select(`
          user_id,
          messages!inner(count)
        `)
        .limit(10);

      const topUsers = topUsersData?.reduce((acc: any, conv) => {
        if (!acc[conv.user_id]) {
          acc[conv.user_id] = {
            user_id: conv.user_id,
            conversation_count: 0,
            message_count: 0
          };
        }
        acc[conv.user_id].conversation_count += 1;
        acc[conv.user_id].message_count += conv.messages?.length || 0;
        return acc;
      }, {}) || {};

      // Get peak usage hours
      const { data: hourlyData } = await supabase
        .from('conversations')
        .select('created_at')
        .gte('created_at', oneWeekAgo.toISOString());

      const peakUsageHours = hourlyData?.reduce((acc: any, conv) => {
        const hour = new Date(conv.created_at).getHours();
        if (!acc[hour]) {
          acc[hour] = { hour, count: 0 };
        }
        acc[hour].count += 1;
        return acc;
      }, {}) || {};

      setAnalytics({
        totalConversations: totalConversations || 0,
        totalMessages: totalMessages || 0,
        uniqueUsers: new Set(uniqueUsersData?.map(d => d.user_id)).size || 0,
        averageMessagesPerConversation: totalMessages && totalConversations 
          ? Math.round((totalMessages / totalConversations) * 10) / 10 
          : 0,
        todayConversations: todayConversations || 0,
        thisWeekConversations: thisWeekConversations || 0,
        avgResponseTime: 1200, // Placeholder - would need edge function metrics
        errorRate: 2.3, // Placeholder - would need error tracking
        usageTrends: Object.values(usageTrends).slice(-30) as Array<{date: string; conversations: number; messages: number}>,
        topUsers: Object.values(topUsers).slice(0, 10) as Array<{user_id: string; conversation_count: number; message_count: number}>,
        peakUsageHours: Object.values(peakUsageHours).sort((a: any, b: any) => b.count - a.count) as Array<{hour: number; count: number}>
      });

    } catch (error: any) {
      console.error('Error fetching AI chat analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load AI chat analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    analytics,
    loading,
    refetch: fetchAnalytics
  };
}