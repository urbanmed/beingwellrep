import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  exportType: 'pdf_report' | 'json_data' | 'medical_summary' | 'bulk_documents';
  parameters: Record<string, any>;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth header
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !userData.user) {
      throw new Error('Invalid authentication');
    }

    const { exportType, parameters }: ExportRequest = await req.json();
    
    console.log('Processing export:', exportType, 'for user:', userData.user.id);

    // Create export job record
    const { data: exportJob, error: jobError } = await supabase
      .from('export_jobs')
      .insert({
        user_id: userData.user.id,
        export_type: exportType,
        status: 'processing',
        parameters,
        progress_percentage: 0,
      })
      .select()
      .single();

    if (jobError || !exportJob) {
      throw new Error('Failed to create export job');
    }

    // Start background processing
    EdgeRuntime.waitUntil(processExport(exportJob.id, userData.user.id, exportType, parameters));

    return new Response(JSON.stringify({ 
      success: true, 
      exportJobId: exportJob.id,
      message: 'Export started. You will be notified when it completes.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-export function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processExport(
  exportJobId: string, 
  userId: string, 
  exportType: string, 
  parameters: Record<string, any>
) {
  try {
    console.log('Starting background export processing for job:', exportJobId);

    // Update progress
    await updateProgress(exportJobId, 25, 'Gathering data...');

    let exportData;
    let fileName;
    let fileContent;

    switch (exportType) {
      case 'json_data':
        exportData = await exportJsonData(userId, parameters);
        fileName = `health-data-${new Date().toISOString().split('T')[0]}.json`;
        fileContent = JSON.stringify(exportData, null, 2);
        break;

      case 'medical_summary':
        exportData = await exportMedicalSummary(userId, parameters);
        fileName = `medical-summary-${new Date().toISOString().split('T')[0]}.json`;
        fileContent = JSON.stringify(exportData, null, 2);
        break;

      case 'pdf_report':
        exportData = await generatePdfReport(userId, parameters);
        fileName = `health-report-${new Date().toISOString().split('T')[0]}.json`;
        fileContent = JSON.stringify(exportData, null, 2);
        break;

      case 'bulk_documents':
        exportData = await exportBulkDocuments(userId, parameters);
        fileName = `documents-export-${new Date().toISOString().split('T')[0]}.json`;
        fileContent = JSON.stringify(exportData, null, 2);
        break;

      default:
        throw new Error('Unsupported export type');
    }

    await updateProgress(exportJobId, 75, 'Generating file...');

    // For now, store as blob in the database (in production, would upload to storage)
    const encoder = new TextEncoder();
    const fileData = encoder.encode(fileContent);
    const fileSize = fileData.length;

    await updateProgress(exportJobId, 100, 'Complete');

    // Mark as completed
    await supabase
      .from('export_jobs')
      .update({
        status: 'completed',
        file_name: fileName,
        file_size: fileSize,
        progress_percentage: 100,
        // In production, would set file_url to storage URL
        parameters: { ...parameters, downloadData: fileContent }
      })
      .eq('id', exportJobId);

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Export Complete',
        message: `Your ${exportType.replace('_', ' ')} export is ready for download.`,
        type: 'success',
        category: 'general',
        priority: 2,
        metadata: { exportJobId },
      });

    console.log('Export completed successfully for job:', exportJobId);

  } catch (error) {
    console.error('Error processing export:', error);
    
    await supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', exportJobId);

    // Create error notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Export Failed',
        message: `Your export failed to complete: ${error.message}`,
        type: 'error',
        category: 'general',
        priority: 3,
      });
  }
}

async function updateProgress(exportJobId: string, percentage: number, status?: string) {
  await supabase
    .from('export_jobs')
    .update({
      progress_percentage: percentage,
      ...(status && { parameters: { status } })
    })
    .eq('id', exportJobId);
}

async function exportJsonData(userId: string, parameters: Record<string, any>) {
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId);

  const { data: summaries } = await supabase
    .from('summaries')
    .select('*')
    .eq('user_id', userId);

  const { data: doctorNotes } = await supabase
    .from('doctor_notes')
    .select('*')
    .eq('user_id', userId);

  return {
    exportDate: new Date().toISOString(),
    reports: reports || [],
    summaries: summaries || [],
    doctorNotes: doctorNotes || [],
  };
}

async function exportMedicalSummary(userId: string, parameters: Record<string, any>) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: recentReports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    exportDate: new Date().toISOString(),
    patientInfo: profile,
    recentReports: recentReports || [],
    summary: 'Medical summary export completed',
  };
}

async function generatePdfReport(userId: string, parameters: Record<string, any>) {
  // In production, would generate actual PDF
  return {
    exportDate: new Date().toISOString(),
    reportType: 'PDF Health Report',
    message: 'PDF generation would be implemented here',
  };
}

async function exportBulkDocuments(userId: string, parameters: Record<string, any>) {
  const { data: reports } = await supabase
    .from('reports')
    .select('id, title, file_url, file_name, created_at')
    .eq('user_id', userId);

  return {
    exportDate: new Date().toISOString(),
    documentCount: reports?.length || 0,
    documents: reports || [],
  };
}