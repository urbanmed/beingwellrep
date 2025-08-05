import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Eye } from "lucide-react";
import { useState } from "react";

interface SimpleDocumentDisplayProps {
  report: {
    file_url: string | null;
    extracted_text: string | null;
    title: string;
  };
}

export function SimpleDocumentDisplay({ report }: SimpleDocumentDisplayProps) {
  const [showText, setShowText] = useState(false);

  const handleViewOriginal = () => {
    if (report.file_url) {
      window.open(report.file_url, '_blank');
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
          {report.file_url ? (
            <div className="space-y-4">
              {isPDF ? (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={report.file_url}
                    className="w-full h-96"
                    title={`${report.title} - Original Document`}
                  />
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={report.file_url}
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

      {/* Extracted Text Section */}
      {report.extracted_text && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Extracted Text
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowText(!showText)}
              >
                {showText ? 'Hide' : 'Show'} Text
              </Button>
            </div>
          </CardHeader>
          
          {showText && (
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {report.extracted_text}
                </pre>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}