import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

interface CustomStructuredDataViewerProps {
  parsedData: {
    reportType?: string;
    extractedData?: {
      patientInformation?: string;
      hospitalLabInformation?: string;
      labTestResults?: string;
    };
    confidence?: number;
  };
}

export function CustomStructuredDataViewer({ parsedData }: CustomStructuredDataViewerProps) {
  const { extractedData } = parsedData;

  if (!extractedData) {
    return null;
  }

  // Custom markdown components for better table styling
  const components = {
    table: ({ children }: any) => (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border rounded-md">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-muted">{children}</thead>
    ),
    th: ({ children }: any) => (
      <th className="border border-border px-3 py-2 text-left font-semibold text-sm">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-border px-3 py-2 text-sm">
        {children}
      </td>
    ),
    tr: ({ children }: any) => (
      <tr className="hover:bg-muted/50">{children}</tr>
    ),
  };

  return (
    <div className="space-y-6">
      {/* Patient Information Section */}
      {extractedData.patientInformation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Patient Information
              <Badge variant="secondary" className="text-xs">
                Confidence: {Math.round((parsedData.confidence || 0) * 100)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown components={components}>
                {extractedData.patientInformation}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hospital/Lab Information Section */}
      {extractedData.hospitalLabInformation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Medical Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown components={components}>
                {extractedData.hospitalLabInformation}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lab Test Results Section */}
      {extractedData.labTestResults && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Lab Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown components={components}>
                {extractedData.labTestResults}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}