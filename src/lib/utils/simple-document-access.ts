import { supabase } from "@/integrations/supabase/client";
import { parseStorageUrl } from "@/lib/storage";

export interface DocumentAccessResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function generateDocumentUrl(fileUrl: string | null): Promise<DocumentAccessResult> {
  if (!fileUrl) {
    return { success: false, error: "No file URL provided" };
  }

  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    // Parse the file URL to get bucket and path
    let bucket = 'medical-documents';
    let filePath = fileUrl;

    const parsed = parseStorageUrl(fileUrl);
    if (parsed) {
      bucket = parsed.bucket;
      filePath = parsed.path;
    }

    console.log(`Generating signed URL for: ${bucket}/${filePath}`);

    // Generate signed URL with 1 hour expiry
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error('Error generating signed URL:', error);
      return { 
        success: false, 
        error: `Unable to access document: ${error.message}` 
      };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    console.error('Unexpected error in generateDocumentUrl:', error);
    return { 
      success: false, 
      error: "Unexpected error accessing document" 
    };
  }
}

export async function checkDocumentExists(fileUrl: string | null): Promise<boolean> {
  if (!fileUrl) return false;

  try {
    // Parse the file URL to get bucket and path
    let bucket = 'medical-documents';
    let filePath = fileUrl;

    const parsed = parseStorageUrl(fileUrl);
    if (parsed) {
      bucket = parsed.bucket;
      filePath = parsed.path;
    }

    // Try to get file info (this is lightweight)
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      });

    if (error) {
      console.error('Error checking file existence:', error);
      return false;
    }

    const fileName = filePath.split('/').pop();
    return data ? data.some(file => file.name === fileName) : false;
  } catch (error) {
    console.error('Error in checkDocumentExists:', error);
    return false;
  }
}