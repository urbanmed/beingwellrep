import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SosAlert {
  id: string;
  user_id: string;
  status: string;
  triggered_at: string;
  location_data?: any;
  sms_sent: boolean;
  cancelled_at?: string;
  completed_at?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  };
}

export interface SosStats {
  activeAlerts: number;
  averageResponseTime: number;
  resolvedToday: number;
  falseAlarms: number;
}

export const useSosMonitoring = () => {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [stats, setStats] = useState<SosStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSosData = async () => {
    try {
      setLoading(true);

      // Fetch SOS alerts with profile data
      const { data: alertsData, error: alertsError } = await supabase
        .from('sos_activations')
        .select('*')
        .order('triggered_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Fetch profiles separately to avoid join issues
      const userIds = alertsData?.map(alert => alert.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone_number')
        .in('user_id', userIds);

      // Transform the data to include profile information
      const transformedAlerts = alertsData?.map(alert => {
        const profile = profilesData?.find(p => p.user_id === alert.user_id);
        return {
          ...alert,
          profile: profile ? {
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone_number: profile.phone_number,
          } : undefined,
        };
      }) || [];

      setAlerts(transformedAlerts);

      // Calculate statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeAlerts = transformedAlerts.filter(alert => alert.status === 'triggered').length;
      
      const resolvedToday = transformedAlerts.filter(alert => {
        if (!alert.completed_at) return false;
        const completedDate = new Date(alert.completed_at);
        return completedDate >= today;
      }).length;

      const falseAlarms = transformedAlerts.filter(alert => alert.cancelled_at).length;

      // Calculate average response time (in minutes)
      const resolvedAlerts = transformedAlerts.filter(alert => alert.completed_at);
      const avgResponseTime = resolvedAlerts.length > 0
        ? resolvedAlerts.reduce((sum, alert) => {
            const triggered = new Date(alert.triggered_at);
            const completed = new Date(alert.completed_at!);
            return sum + (completed.getTime() - triggered.getTime()) / (1000 * 60); // Convert to minutes
          }, 0) / resolvedAlerts.length
        : 0;

      setStats({
        activeAlerts,
        averageResponseTime: Math.round(avgResponseTime),
        resolvedToday,
        falseAlarms,
      });
    } catch (error) {
      console.error('Error fetching SOS data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch SOS monitoring data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const respondToAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('sos_activations')
        .update({ 
          status: 'responding',
          completed_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'responding', completed_at: new Date().toISOString() }
          : alert
      ));

      toast({
        title: "Success",
        description: "Alert response recorded",
      });

      // Refresh stats
      await fetchSosData();
    } catch (error) {
      console.error('Error responding to alert:', error);
      toast({
        title: "Error",
        description: "Failed to respond to alert",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSosData();

    // Set up real-time subscription
    const channel = supabase
      .channel('sos-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sos_activations'
        },
        () => {
          fetchSosData(); // Refresh all data when any SOS activation changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    alerts,
    stats,
    loading,
    fetchSosData,
    respondToAlert,
  };
};