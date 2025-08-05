import { supabase } from "@/integrations/supabase/client";

interface ReportFileStatus {
  reportId: string;
  title: string;
  fileUrl: string | null;
  fileExists: boolean;
  alternativeFiles?: string[];
  error?: string;
}

export async function checkReportFileConsistency(reportId?: string): Promise<ReportFileStatus[]> {
  try {
    console.log('Starting file consistency check...');
    
    // Get reports to check
    let query = supabase
      .from('reports')
      .select('id, title, file_url')
      .not('file_url', 'is', null);
    
    if (reportId) {
      query = query.eq('id', reportId);
    }
    
    const { data: reports, error: reportsError } = await query;
    
    if (reportsError) {
      throw reportsError;
    }
    
    if (!reports || reports.length === 0) {
      console.log('No reports with files found');
      return [];
    }
    
    console.log(`Checking ${reports.length} reports for file consistency...`);
    
    const results: ReportFileStatus[] = [];
    
    for (const report of reports) {
      const result: ReportFileStatus = {
        reportId: report.id,
        title: report.title,
        fileUrl: report.file_url,
        fileExists: false
      };
      
      try {
        if (!report.file_url) {
          result.error = 'No file URL in database';
          results.push(result);
          continue;
        }
        
        // Check if the exact file exists
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('medical-documents')
          .download(report.file_url);
        
        if (!downloadError && downloadData) {
          result.fileExists = true;
        } else {
          // File doesn't exist, check for alternatives in user directory
          const pathParts = report.file_url.split('/');
          if (pathParts.length >= 2) {
            const userDirectory = pathParts[0];
            
            const { data: userFiles, error: listError } = await supabase.storage
              .from('medical-documents')
              .list(userDirectory);
            
            if (!listError && userFiles && userFiles.length > 0) {
              result.alternativeFiles = userFiles.map(f => `${userDirectory}/${f.name}`);
            }
          }
          
          result.error = downloadError?.message || 'File not found';
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      results.push(result);
    }
    
    console.log('File consistency check complete:', results);
    return results;
    
  } catch (error) {
    console.error('Error in file consistency check:', error);
    throw error;
  }
}

export async function fixReportFileUrl(reportId: string, newFileUrl: string): Promise<boolean> {
  try {
    console.log(`Fixing file URL for report ${reportId} to ${newFileUrl}`);
    
    // Verify the new file exists
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('medical-documents')
      .download(newFileUrl);
    
    if (downloadError || !downloadData) {
      throw new Error(`New file URL does not exist: ${downloadError?.message}`);
    }
    
    // Update the report with the new file URL
    const { error: updateError } = await supabase
      .from('reports')
      .update({ file_url: newFileUrl })
      .eq('id', reportId);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`Successfully updated file URL for report ${reportId}`);
    return true;
    
  } catch (error) {
    console.error(`Error fixing file URL for report ${reportId}:`, error);
    throw error;
  }
}

export function generateConsistencyReport(results: ReportFileStatus[]): string {
  const totalReports = results.length;
  const validFiles = results.filter(r => r.fileExists).length;
  const missingFiles = results.filter(r => !r.fileExists).length;
  const withAlternatives = results.filter(r => r.alternativeFiles && r.alternativeFiles.length > 0).length;
  
  let report = `File Consistency Report\n`;
  report += `=======================\n`;
  report += `Total reports checked: ${totalReports}\n`;
  report += `Files found: ${validFiles}\n`;
  report += `Missing files: ${missingFiles}\n`;
  report += `Reports with alternative files: ${withAlternatives}\n\n`;
  
  if (missingFiles > 0) {
    report += `Reports with missing files:\n`;
    report += `---------------------------\n`;
    results.filter(r => !r.fileExists).forEach(r => {
      report += `- ${r.title} (ID: ${r.reportId})\n`;
      report += `  File URL: ${r.fileUrl}\n`;
      report += `  Error: ${r.error}\n`;
      if (r.alternativeFiles && r.alternativeFiles.length > 0) {
        report += `  Alternative files: ${r.alternativeFiles.join(', ')}\n`;
      }
      report += `\n`;
    });
  }
  
  return report;
}