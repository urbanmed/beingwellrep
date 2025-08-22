import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useDocumentRecovery() {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const resetFailedDocuments = async () => {
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-failed-processing');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Recovery Complete",
          description: data.message,
        });
        return data;
      } else {
        throw new Error(data.error || 'Reset failed');
      }
    } catch (error) {
      console.error('Recovery failed:', error);
      toast({
        title: "Recovery Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsResetting(false);
    }
  };

  return {
    resetFailedDocuments,
    isResetting
  };
}