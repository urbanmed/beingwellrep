import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsData {
  totalUsers: number;
  totalReports: number;
  totalFileSize: number;
  avgProcessingTime: number;
  recentActivity: Array<{
    event_type: string;
    created_at: string;
    event_data: any;
  }>;
  usageTrends: Array<{
    date: string;
    users: number;
    reports: number;
    processing_time: number;
  }>;
}

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total reports
      const { count: totalReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true });

      // Fetch file size sum
      const { data: fileSizeData } = await supabase
        .from('reports')
        .select('file_size');
      
      const totalFileSize = fileSizeData?.reduce((sum, report) => sum + (report.file_size || 0), 0) || 0;

      // Fetch average processing time
      const { data: processingData } = await supabase
        .from('analytics')
        .select('processing_time_ms')
        .not('processing_time_ms', 'is', null);
      
      const avgProcessingTime = processingData?.length > 0
        ? processingData.reduce((sum, item) => sum + (item.processing_time_ms || 0), 0) / processingData.length
        : 0;

      // Fetch recent activity
      const { data: recentActivity } = await supabase
        .from('analytics')
        .select('event_type, created_at, event_data')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch usage trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: trendsData } = await supabase
        .from('analytics')
        .select('created_at, processing_time_ms')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Group trends by day
      const trendsByDay = new Map<string, { users: Set<string>, reports: number, totalProcessingTime: number, count: number }>();
      
      trendsData?.forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        if (!trendsByDay.has(date)) {
          trendsByDay.set(date, { users: new Set(), reports: 0, totalProcessingTime: 0, count: 0 });
        }
        const dayData = trendsByDay.get(date)!;
        dayData.reports++;
        if (item.processing_time_ms) {
          dayData.totalProcessingTime += item.processing_time_ms;
          dayData.count++;
        }
      });

      const usageTrends = Array.from(trendsByDay.entries()).map(([date, data]) => ({
        date,
        users: data.users.size,
        reports: data.reports,
        processing_time: data.count > 0 ? data.totalProcessingTime / data.count : 0,
      })).sort((a, b) => a.date.localeCompare(b.date));

      setAnalytics({
        totalUsers: totalUsers || 0,
        totalReports: totalReports || 0,
        totalFileSize,
        avgProcessingTime,
        recentActivity: recentActivity || [],
        usageTrends,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
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
    fetchAnalytics,
  };
};