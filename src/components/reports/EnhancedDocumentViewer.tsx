import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Eye, BarChart3 } from "lucide-react";
import { CustomStructuredDataViewer } from "./CustomStructuredDataViewer";
import { SimpleDocumentViewer } from "./SimpleDocumentViewer";

interface EnhancedDocumentViewerProps {
  report: {
    id: string;
    title: string;
    type?: string;
    parsing_status: string;
    parsed_data?: any;
    confidence_score?: number;
    extracted_text?: string;
    file_url: string | null;
    physician_name?: string;
    facility_name?: string;
    report_date?: string;
    file_name?: string | null;
  };
}

export function EnhancedDocumentViewer({ report }: EnhancedDocumentViewerProps) {
  const [activeTab, setActiveTab] = useState("structured");

  const hasStructuredData = report.parsed_data && 
    (report.parsed_data.sections?.length > 0 || 
     report.parsed_data.tests?.length > 0 ||
     report.parsed_data.medications?.length > 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'processing': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {report.title}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusColor(report.parsing_status)}>
                  {report.parsing_status.charAt(0).toUpperCase() + report.parsing_status.slice(1)}
                </Badge>
                {report.confidence_score && (
                  <Badge variant="outline">
                    Confidence: {Math.round(report.confidence_score * 100)}%
                  </Badge>
                )}
                {report.type && (
                  <Badge variant="secondary">
                    {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="structured" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Extracted Data
          </TabsTrigger>
          <TabsTrigger value="original" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Original Document
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structured" className="mt-6">
          {hasStructuredData ? (
            <CustomStructuredDataViewer parsedData={report.parsed_data} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground space-y-2">
                  <BarChart3 className="h-12 w-12 mx-auto opacity-50" />
                  <p className="font-medium">No structured data available</p>
                  <p className="text-sm">
                    {report.parsing_status === 'processing' 
                      ? 'Document is still being processed. Please check back in a few moments.'
                      : 'This document may be image-only or require manual review.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="original" className="mt-6">
          {report.file_url ? (
            <SimpleDocumentViewer report={report} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground space-y-2">
                  <FileText className="h-12 w-12 mx-auto opacity-50" />
                  <p className="font-medium">Original document not available</p>
                  <p className="text-sm">The original file could not be located.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}