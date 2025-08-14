import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileConsistencyIssue {
  reportId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  issueType: 'missing_file' | 'corrupted_file' | 'invalid_path' | 'access_denied';
  canReupload: boolean;
}

interface ConsistencyReport {
  totalReports: number;
  validFiles: number;
  issuesFound: FileConsistencyIssue[];
  checkedAt: Date;
}

export function useFileConsistencyChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const checkFileConsistency = async (reportId?: string): Promise<ConsistencyReport> => {
    setIsChecking(true);
    
    try {
      // Get user's reports that should have files
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('id, title, file_name, file_url, user_id')
        .not('file_url', 'is', null)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .then(result => reportId ? 
          { ...result, data: result.data?.filter(r => r.id === reportId) } : 
          result
        );

      if (reportsError) {
        throw new Error(`Failed to fetch reports: ${reportsError.message}`);
      }

      const issues: FileConsistencyIssue[] = [];
      const totalReports = reports?.length || 0;
      let validFiles = 0;

      for (const report of reports || []) {
        try {
          // Check if file exists in storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('medical-documents')
            .download(report.file_url);

          if (downloadError || !fileData) {
            // Try to list the file to see if it's an access issue vs missing file
            const pathParts = report.file_url.split('/');
            const fileName = pathParts.pop();
            const folderPath = pathParts.join('/');

            const { data: fileList, error: listError } = await supabase.storage
              .from('medical-documents')
              .list(folderPath, { search: fileName });

            const issueType = listError || !fileList || fileList.length === 0 
              ? 'missing_file' 
              : 'access_denied';

            issues.push({
              reportId: report.id,
              title: report.title,
              fileName: report.file_name,
              fileUrl: report.file_url,
              issueType,
              canReupload: true
            });
          } else {
            validFiles++;
          }
        } catch (error) {
          console.error(`Error checking file for report ${report.id}:`, error);
          issues.push({
            reportId: report.id,
            title: report.title,
            fileName: report.file_name,
            fileUrl: report.file_url,
            issueType: 'invalid_path',
            canReupload: true
          });
        }
      }

      const report: ConsistencyReport = {
        totalReports,
        validFiles,
        issuesFound: issues,
        checkedAt: new Date()
      };

      toast({
        title: "File Consistency Check Complete",
        description: `${totalReports} reports checked. ${validFiles} files OK, ${issues.length} issues found.`,
        variant: issues.length > 0 ? "destructive" : "default"
      });

      return report;

    } catch (error) {
      console.error('File consistency check failed:', error);
      toast({
        title: "Error",
        description: "Failed to check file consistency",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsChecking(false);
    }
  };

  const markReportForReupload = async (reportId: string): Promise<boolean> => {
    setIsFixing(true);
    
    try {
      // Clear the file_url and reset parsing status to allow re-upload
      const { error } = await supabase
        .from('reports')
        .update({
          file_url: null,
          parsing_status: 'pending',
          extracted_text: null,
          parsed_data: null,
          parsing_confidence: null
        })
        .eq('id', reportId);

      if (error) {
        throw new Error(`Failed to reset report: ${error.message}`);
      }

      toast({
        title: "Success",
        description: "Report marked for re-upload. You can now upload a new file.",
      });

      return true;
    } catch (error) {
      console.error('Error marking report for reupload:', error);
      toast({
        title: "Error",
        description: "Failed to mark report for re-upload",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsFixing(false);
    }
  };

  const generateConsistencyReport = (report: ConsistencyReport): string => {
    const lines = [
      `File Consistency Report - ${report.checkedAt.toLocaleString()}`,
      '='.repeat(50),
      '',
      `Total Reports Checked: ${report.totalReports}`,
      `Valid Files: ${report.validFiles}`,
      `Issues Found: ${report.issuesFound.length}`,
      ''
    ];

    if (report.issuesFound.length > 0) {
      lines.push('Issues Details:');
      lines.push('-'.repeat(30));
      
      report.issuesFound.forEach((issue, index) => {
        lines.push(`${index + 1}. ${issue.title}`);
        lines.push(`   File: ${issue.fileName}`);
        lines.push(`   Issue: ${issue.issueType.replace('_', ' ')}`);
        lines.push(`   Can Re-upload: ${issue.canReupload ? 'Yes' : 'No'}`);
        lines.push('');
      });
    }

    return lines.join('\n');
  };

  return {
    checkFileConsistency,
    markReportForReupload,
    generateConsistencyReport,
    isChecking,
    isFixing
  };
}