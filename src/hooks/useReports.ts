import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Report {
  id: string;
  title: string;
  report_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  ocr_status: string;
  ocr_confidence: number | null;
  processing_error: string | null;
  physician_name: string | null;
  facility_name: string | null;
  description: string | null;
  file_url: string | null;
  tags: string[];
  is_critical: boolean;
  report_date: string;
  notes: string | null;
  user_id: string;
}

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data || []) as Report[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => prev.filter(r => r.id !== reportId));
      
      toast({
        title: "Success",
        description: "Report deleted",
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const retryOCR = async (reportId: string) => {
    try {
      const { error } = await supabase.functions.invoke('process-ocr', {
        body: { reportId }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'OCR processing restarted',
      });

      // Refresh the list
      await fetchReports();
    } catch (error) {
      console.error('Error retrying OCR:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry OCR processing',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return {
    reports,
    loading,
    fetchReports,
    deleteReport,
    retryOCR,
    refetch: fetchReports
  };
}