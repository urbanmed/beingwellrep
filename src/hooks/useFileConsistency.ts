import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { checkReportFileConsistency, fixReportFileUrl, generateConsistencyReport } from "@/lib/utils/file-consistency-checker";

export function useFileConsistency() {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const checkConsistency = async (reportId?: string) => {
    setIsChecking(true);
    try {
      const results = await checkReportFileConsistency(reportId);
      const report = generateConsistencyReport(results);
      
      console.log(report);
      
      const missingFiles = results.filter(r => !r.fileExists).length;
      
      toast({
        title: "File Consistency Check Complete",
        description: `${results.length} reports checked. ${missingFiles} files missing.`,
        variant: missingFiles > 0 ? "destructive" : "default"
      });
      
      return results;
    } catch (error) {
      console.error('Error checking file consistency:', error);
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

  const fixFileUrl = async (reportId: string, newFileUrl: string) => {
    setIsFixing(true);
    try {
      await fixReportFileUrl(reportId, newFileUrl);
      toast({
        title: "Success",
        description: "File URL updated successfully",
      });
      return true;
    } catch (error) {
      console.error('Error fixing file URL:', error);
      toast({
        title: "Error",
        description: "Failed to fix file URL",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsFixing(false);
    }
  };

  return {
    checkConsistency,
    fixFileUrl,
    isChecking,
    isFixing
  };
}