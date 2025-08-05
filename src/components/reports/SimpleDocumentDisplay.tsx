import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface SimpleDocumentDisplayProps {
  report: {
    file_url: string | null;
    extracted_text: string | null;
    title: string;
  };
}

export function SimpleDocumentDisplay({ report }: SimpleDocumentDisplayProps) {
  const [fileExists, setFileExists] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingFileUrl, setWorkingFileUrl] = useState<string | null>(null);

  // Check if file exists in storage and find fallback if needed
  useEffect(() => {
    const checkFileExists = async () => {
      if (!report.file_url) {
        setFileExists(false);
        setIsChecking(false);
        return;
      }

      try {
        setIsChecking(true);
        setError(null);

        console.log('Checking file existence for:', report.file_url);

        // First, try direct file head check for more reliable existence detection
        const { data: headData, error: headError } = await supabase.storage
          .from('medical-documents')
          .list('', { limit: 1, search: report.file_url.split('/')[1] });

        if (headError) {
          console.error('Head check error:', headError);
        }

        // Try to get the actual file to verify it exists
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('medical-documents')
          .download(report.file_url);

        if (!downloadError && downloadData) {
          console.log('File found directly:', report.file_url);
          setFileExists(true);
          return;
        }

        console.log('Direct file not found, searching for alternatives...');

        // Extract user directory from file_url (format: user_id/filename)
        const pathParts = report.file_url.split('/');
        if (pathParts.length >= 2) {
          const userDirectory = pathParts[0];
          
          console.log('Searching in user directory:', userDirectory);

          // List all files in user directory to find alternatives
          const { data: userFiles, error: listError } = await supabase.storage
            .from('medical-documents')
            .list(userDirectory, {
              limit: 100,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (listError) {
            console.error('Error listing user files:', listError);
            throw listError;
          }

          if (userFiles && userFiles.length > 0) {
            console.log('Found alternative files:', userFiles.map(f => f.name));
            
            // Use the most recent alternative file
            const mostRecentFile = userFiles[0]; // Already sorted by created_at desc
            const alternativeFileUrl = `${userDirectory}/${mostRecentFile.name}`;
            
            console.log('Using alternative file:', alternativeFileUrl);
            setWorkingFileUrl(alternativeFileUrl);
            setFileExists(true);
            return;
          }
        }

        console.log('No files found for this report');
        setFileExists(false);
        setError('No files found for this report.');

      } catch (err) {
        console.error('Error in file existence check:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setFileExists(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkFileExists();
  }, [report.file_url]);

  // Construct the proper Supabase storage URL
  const getDocumentUrl = () => {
    if (!fileExists) return null;
    
    // Use the working file URL if available, otherwise fall back to original
    const fileUrl = workingFileUrl || report.file_url;
    if (!fileUrl) return null;
    
    try {
      const { data } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(fileUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Error constructing document URL:', error);
      return null;
    }
  };

  const documentUrl = getDocumentUrl();

  const handleViewOriginal = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  const isPDF = report.file_url?.toLowerCase().includes('.pdf');

  return (
    <div className="space-y-4">
      {/* Original Document Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Original Document
            </CardTitle>
            {fileExists && documentUrl && (
              <Button onClick={handleViewOriginal} size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Original
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {isChecking ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">Checking file availability...</div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error accessing document: {error}
              </AlertDescription>
            </Alert>
          ) : !report.file_url ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No file was uploaded for this report.
              </AlertDescription>
            </Alert>
          ) : !fileExists ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The original document file could not be found. It may have been deleted or moved.
              </AlertDescription>
            </Alert>
          ) : documentUrl ? (
            <div className="space-y-4">
              {isPDF ? (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={documentUrl}
                    className="w-full h-96"
                    title={`${report.title} - Original Document`}
                    onError={() => setError('Failed to load document preview')}
                  />
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={documentUrl}
                    alt={`${report.title} - Original Document`}
                    className="w-full h-auto max-h-96 object-contain"
                    onError={() => setError('Failed to load document preview')}
                  />
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                Click "View Original" to open the document in a new tab for better viewing.
              </p>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to generate document preview URL.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}