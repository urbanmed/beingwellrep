import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SosActivation {
  id: string;
  user_id: string;
  status: 'triggered' | 'cancelled' | 'completed';
  triggered_at: string;
  cancelled_at?: string;
  completed_at?: string;
  location_data?: any;
  sms_sent: boolean;
  created_at: string;
  updated_at: string;
}

export function useSosActivation() {
  const [activating, setActivating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const triggerSos = async (locationData?: any) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use SOS feature.",
        variant: "destructive",
      });
      return { error: 'No user authenticated' };
    }

    try {
      setActivating(true);
      
      const { data, error } = await supabase
        .from('sos_activations')
        .insert([
          {
            user_id: user.id,
            status: 'triggered',
            location_data: locationData,
            sms_sent: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "SOS Activated",
        description: "Emergency alert has been triggered.",
        variant: "destructive",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error triggering SOS:', error);
      toast({
        title: "SOS activation failed",
        description: "Failed to activate emergency alert. Please try again.",
        variant: "destructive",
      });
      return { error };
    } finally {
      setActivating(false);
    }
  };

  const cancelSos = async (activationId: string) => {
    if (!user) return { error: 'No user authenticated' };

    try {
      const { data, error } = await supabase
        .from('sos_activations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', activationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "SOS Cancelled",
        description: "Emergency alert has been cancelled.",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error cancelling SOS:', error);
      toast({
        title: "SOS cancellation failed",
        description: "Failed to cancel emergency alert.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const completeSos = async (activationId: string) => {
    if (!user) return { error: 'No user authenticated' };

    try {
      const { data, error } = await supabase
        .from('sos_activations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: true,
        })
        .eq('id', activationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error completing SOS:', error);
      return { error };
    }
  };

  return {
    activating,
    triggerSos,
    cancelSos,
    completeSos,
  };
}