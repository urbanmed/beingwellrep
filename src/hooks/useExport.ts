import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExportJob {
  id: string;
  user_id: string;
  export_type: 'pdf_report' | 'json_data' | 'medical_summary' | 'bulk_documents';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  parameters: Record<string, any>;
  progress_percentage: number;
  error_message?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export const useExport = () => {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch export jobs
  const fetchExportJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setExportJobs((data as ExportJob[]) || []);
    } catch (error) {
      console.error('Error fetching export jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start export
  const startExport = async (
    exportType: ExportJob['export_type'], 
    parameters: Record<string, any> = {}
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-export', {
        body: { exportType, parameters }
      });

      if (error) throw error;

      toast({
        title: "Export Started",
        description: "Your export has been queued for processing. You'll be notified when it's complete.",
      });

      // Refresh the list
      fetchExportJobs();

      return data;
    } catch (error) {
      console.error('Error starting export:', error);
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Download export
  const downloadExport = async (exportJob: ExportJob) => {
    try {
      if (!exportJob.file_url && !exportJob.parameters?.downloadData) {
        throw new Error('Export file not available');
      }

      // For now, use the data stored in parameters
      // In production, would download from file_url
      if (exportJob.parameters?.downloadData) {
        const blob = new Blob([exportJob.parameters.downloadData], {
          type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportJob.file_name || `export-${exportJob.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Download Started",
          description: "Your export file is downloading.",
        });
      }
    } catch (error) {
      console.error('Error downloading export:', error);
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Delete export job
  const deleteExportJob = async (exportJobId: string) => {
    try {
      const { error } = await supabase
        .from('export_jobs')
        .delete()
        .eq('id', exportJobId);

      if (error) throw error;

      setExportJobs(prev => prev.filter(job => job.id !== exportJobId));
      
      toast({
        title: "Export Deleted",
        description: "Export job has been removed.",
      });
    } catch (error) {
      console.error('Error deleting export job:', error);
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Retry failed export
  const retryExport = async (exportJob: ExportJob) => {
    try {
      await startExport(exportJob.export_type, exportJob.parameters);
    } catch (error) {
      console.error('Error retrying export:', error);
    }
  };

  // Export presets
  const exportHealthSummary = () => {
    return startExport('medical_summary', {
      includeReports: true,
      includeSummaries: true,
      timeframe: '1year'
    });
  };

  const exportAllData = () => {
    return startExport('json_data', {
      includeReports: true,
      includeSummaries: true,
      includeDoctorNotes: true,
      includeProfile: true
    });
  };

  const exportRecentReports = () => {
    return startExport('bulk_documents', {
      timeframe: '3months',
      format: 'json'
    });
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchExportJobs();

    const channel = supabase
      .channel('export-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'export_jobs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setExportJobs(prev => [payload.new as ExportJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setExportJobs(prev => 
              prev.map(job => 
                job.id === payload.new.id ? payload.new as ExportJob : job
              )
            );
            
            // Show notification for completed exports
            const updatedJob = payload.new as ExportJob;
            if (updatedJob.status === 'completed') {
              toast({
                title: "Export Complete",
                description: `Your ${updatedJob.export_type.replace('_', ' ')} export is ready for download.`,
              });
            } else if (updatedJob.status === 'failed') {
              toast({
                title: "Export Failed",
                description: updatedJob.error_message || 'Export processing failed.',
                variant: "destructive",
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setExportJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Helper functions
  const getJobsByStatus = (status: ExportJob['status']) => {
    return exportJobs.filter(job => job.status === status);
  };

  const getRecentJobs = (days: number = 7) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return exportJobs.filter(
      job => new Date(job.created_at) > cutoff
    );
  };

  const getTotalExportSize = () => {
    return exportJobs
      .filter(job => job.file_size)
      .reduce((total, job) => total + (job.file_size || 0), 0);
  };

  return {
    exportJobs,
    loading,
    startExport,
    downloadExport,
    deleteExportJob,
    retryExport,
    fetchExportJobs,
    exportHealthSummary,
    exportAllData,
    exportRecentReports,
    getJobsByStatus,
    getRecentJobs,
    getTotalExportSize,
  };
};