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
  parsing_status: string;
  extraction_confidence: number | null;
  parsing_confidence: number | null;
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
  extracted_text: string | null;
  parsed_data: any | null;
  parsing_model: string | null;
}

export function useReports(familyMemberId?: string | null) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select('*');

      // Filter by family member
      if (familyMemberId === null || familyMemberId === undefined) {
        // Self - reports with no family_member_id
        query = query.is('family_member_id', null);
      } else {
        // Specific family member
        query = query.eq('family_member_id', familyMemberId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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
      // First get the report to access the file_url for cleanup
      const { data: report, error: fetchError } = await supabase
        .from('reports')
        .select('file_url, file_name')
        .eq('id', reportId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the file from storage if it exists
      if (report?.file_url) {
        const filePath = report.file_url.split('/').pop();
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('medical-documents')
            .remove([filePath]);
          
          if (storageError) {
            console.warn('Failed to delete file from storage:', storageError);
          }
        }
      }

      // Delete the report from database
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => prev.filter(r => r.id !== reportId));
      
      toast({
        title: "Success",
        description: "Report and associated files deleted",
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

  const deleteMultipleReports = async (reportIds: string[]) => {
    try {
      // Get all reports to access file URLs for cleanup
      const { data: reportsToDelete, error: fetchError } = await supabase
        .from('reports')
        .select('id, file_url, file_name')
        .in('id', reportIds);

      if (fetchError) throw fetchError;

      // Collect file paths to delete from storage
      const filePaths: string[] = [];
      reportsToDelete?.forEach(report => {
        if (report.file_url) {
          const filePath = report.file_url.split('/').pop();
          if (filePath) {
            filePaths.push(filePath);
          }
        }
      });

      // Delete files from storage if any exist
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('medical-documents')
          .remove(filePaths);
        
        if (storageError) {
          console.warn('Failed to delete some files from storage:', storageError);
        }
      }

      // Delete reports from database
      const { error } = await supabase
        .from('reports')
        .delete()
        .in('id', reportIds);

      if (error) throw error;

      setReports(prev => prev.filter(r => !reportIds.includes(r.id)));
      
      toast({
        title: "Success",
        description: `${reportIds.length} report${reportIds.length > 1 ? 's' : ''} deleted`,
      });
    } catch (error) {
      console.error('Error deleting reports:', error);
      toast({
        title: "Error",
        description: "Failed to delete reports",
        variant: "destructive",
      });
    }
  };

  const retryProcessing = async (reportId: string) => {
    try {
      const { error } = await supabase.functions.invoke('process-medical-document', {
        body: { reportId }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Document processing restarted',
      });

      // Refresh the list
      await fetchReports();
    } catch (error) {
      console.error('Error retrying document processing:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry document processing',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchReports();
  }, [familyMemberId]);

  return {
    reports,
    loading,
    fetchReports,
    deleteReport,
    deleteMultipleReports,
    retryProcessing,
    refetch: fetchReports
  };
}