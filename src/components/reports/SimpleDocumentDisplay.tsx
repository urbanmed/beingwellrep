import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

interface SimpleDocumentDisplayProps {
  report: {
    file_url: string | null;
    extracted_text: string | null;
    title: string;
  };
}

export function SimpleDocumentDisplay({ report }: SimpleDocumentDisplayProps) {
  // Construct the proper Supabase storage URL
  const getDocumentUrl = () => {
    if (!report.file_url) return null;
    
    try {
      const { data } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(report.file_url);
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
            {report.file_url && (
              <Button onClick={handleViewOriginal} size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Original
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {documentUrl ? (
            <div className="space-y-4">
              {isPDF ? (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={documentUrl}
                    className="w-full h-96"
                    title={`${report.title} - Original Document`}
                  />
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={documentUrl}
                    alt={`${report.title} - Original Document`}
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                Click "View Original" to open the document in a new tab for better viewing.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Original document not available</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}