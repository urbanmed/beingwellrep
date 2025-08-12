import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ImportJob {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  validation_results?: any;
  imported_record_count?: number;
  error_log?: any[];
  file_url?: string;
  file_size?: number;
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface ImportTemplate {
  id: string;
  name: string;
  description?: string;
  file_type: string;
  template_data: any;
  schema_definition: any;
  example_data?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useImportJobs = () => {
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch import jobs
  const fetchImportJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImportJobs((data || []) as ImportJob[]);
    } catch (error) {
      console.error('Error fetching import jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch import jobs",
        variant: "destructive",
      });
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('import_templates')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch import templates",
        variant: "destructive",
      });
    }
  };

  // Create import job
  const createImportJob = async (fileName: string, fileType: string, fileSize: number): Promise<string> => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('import_jobs')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchImportJobs(); // Refresh jobs list
      return data.id;
    } catch (error) {
      console.error('Error creating import job:', error);
      toast({
        title: "Error",
        description: "Failed to create import job",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Process import
  const processImport = async (importJobId: string, fileContent: string, fileName: string, fileType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-import', {
        body: {
          importJobId,
          fileContent,
          fileName,
          fileType
        }
      });

      if (error) throw error;

      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.importedCount} records`,
      });

      await fetchImportJobs(); // Refresh jobs list
      return data;
    } catch (error) {
      console.error('Error processing import:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to process import",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Generate template
  const generateTemplate = async (templateId?: string, templateType?: string, format: 'csv' | 'json' = 'csv') => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-import-template', {
        body: {
          templateId,
          templateType,
          format
        }
      });

      if (error) throw error;
      return data.template;
    } catch (error) {
      console.error('Error generating template:', error);
      toast({
        title: "Error",
        description: "Failed to generate template",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Download template
  const downloadTemplate = async (template: ImportTemplate, format: 'csv' | 'json' = 'csv') => {
    try {
      const generatedTemplate = await generateTemplate(template.id, undefined, format);
      
      const blob = new Blob([generatedTemplate.content], { type: generatedTemplate.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generatedTemplate.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Template Downloaded",
        description: `${generatedTemplate.fileName} has been downloaded`,
      });
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  // Delete import job
  const deleteImportJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('import_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Import job deleted successfully",
      });

      await fetchImportJobs();
    } catch (error) {
      console.error('Error deleting import job:', error);
      toast({
        title: "Error",
        description: "Failed to delete import job",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchImportJobs(), fetchTemplates()]);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscription for import jobs
    const jobsSubscription = supabase
      .channel('import_jobs_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'import_jobs'
      }, (payload) => {
        console.log('Import job change:', payload);
        fetchImportJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jobsSubscription);
    };
  }, []);

  return {
    importJobs,
    templates,
    loading,
    createImportJob,
    processImport,
    generateTemplate,
    downloadTemplate,
    deleteImportJob,
    fetchImportJobs,
    fetchTemplates
  };
};