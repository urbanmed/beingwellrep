import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseStorageUrl } from "@/lib/storage";

export function useFileDownload() {
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const downloadFile = async (reportId: string, fileName: string, fileUrl?: string) => {
    if (downloading.has(reportId)) return;

    setDownloading(prev => new Set(prev).add(reportId));

    try {
      if (!fileUrl) {
        throw new Error("File URL not available");
      }

      // Resolve bucket and full path safely (supports full storage URL or plain path)
      let bucket: string | undefined;
      let filePath: string | undefined;

      const parsed = parseStorageUrl(fileUrl);
      if (parsed) {
        bucket = parsed.bucket;
        filePath = parsed.path;
      } else {
        // Assume fileUrl is a path inside the default bucket
        bucket = 'medical-documents';
        filePath = fileUrl;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    } finally {
      setDownloading(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const isDownloading = (reportId: string) => downloading.has(reportId);

  return {
    downloadFile,
    isDownloading
  };
}