import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Eye, Download, ExternalLink } from "lucide-react";
import type { ParsedMedicalData } from "@/types/medical-data";
import { 
  parseExtractedTextAsJSON, 
  transformLabReportData, 
  createFallbackDataStructure 
} from "@/lib/utils/extracted-text-parser";

interface DocumentViewerProps {
  report: {
    id: string;
    title: string;
    report_type: string;
    parsing_status: string;
    parsed_data: ParsedMedicalData | null;
    extraction_confidence: number | null;
    parsing_confidence: number | null;
    extracted_text: string | null;
    file_url: string | null;
    physician_name: string | null;
    facility_name: string | null;
    report_date: string;
  };
}

export function DocumentViewer({ report }: DocumentViewerProps) {
  const handleViewOriginal = () => {
    if (report.file_url) {
      window.open(report.file_url, '_blank');
    }
  };

  // Try to get structured data from either parsed_data or extracted_text
  const getStructuredData = (): ParsedMedicalData | null => {
    if (report.parsed_data) {
      return report.parsed_data;
    }

    if (report.extracted_text) {
      // Try to parse extracted_text as JSON
      const parsedFromText = parseExtractedTextAsJSON(report.extracted_text);
      if (parsedFromText) {
        // Transform lab report data if it matches that structure
        const transformedData = transformLabReportData(parsedFromText);
        if (transformedData) {
          return transformedData;
        }
        
        // Create fallback structure for other JSON data
        return createFallbackDataStructure(parsedFromText);
      }
    }

    return null;
  };

  const renderStructuredData = (data: ParsedMedicalData) => {
    switch (data.reportType) {
      case 'lab':
        return renderLabData(data as any);
      case 'prescription':
        return renderPrescriptionData(data as any);
      case 'radiology':
        return renderRadiologyData(data as any);
      case 'vitals':
        return renderVitalsData(data as any);
      default:
        return renderGeneralData(data as any);
    }
  };

  const renderLabData = (data: any) => (
    <div className="space-y-4">
      <h4 className="font-semibold">Lab Results</h4>
      {data.tests?.map((test: any, index: number) => (
        <Card key={index} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h5 className="font-medium">{test.name}</h5>
            {test.status && (
              <Badge variant={
                test.status === 'critical' ? 'destructive' :
                test.status === 'abnormal' ? 'secondary' : 'default'
              }>
                {test.status}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Value:</strong> {test.value} {test.unit}</div>
            {test.referenceRange && (
              <div><strong>Reference:</strong> {test.referenceRange}</div>
            )}
          </div>
          {test.notes && (
            <p className="text-sm text-muted-foreground mt-2">{test.notes}</p>
          )}
        </Card>
      ))}
    </div>
  );

  const renderPrescriptionData = (data: any) => (
    <div className="space-y-4">
      <h4 className="font-semibold">Medications</h4>
      {data.medications?.map((med: any, index: number) => (
        <Card key={index} className="p-4">
          <h5 className="font-medium mb-2">{med.name}</h5>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Dosage:</strong> {med.dosage}</div>
            <div><strong>Frequency:</strong> {med.frequency}</div>
            <div><strong>Duration:</strong> {med.duration}</div>
            <div><strong>Quantity:</strong> {med.quantity}</div>
          </div>
          {med.instructions && (
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Instructions:</strong> {med.instructions}
            </p>
          )}
        </Card>
      ))}
    </div>
  );

  const renderRadiologyData = (data: any) => (
    <div className="space-y-4">
      <h4 className="font-semibold">Radiology Report</h4>
      {data.study && (
        <Card className="p-4">
          <h5 className="font-medium mb-2">Study Details</h5>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Type:</strong> {data.study.type}</div>
            <div><strong>Body Part:</strong> {data.study.bodyPart}</div>
            <div><strong>Technique:</strong> {data.study.technique}</div>
            <div><strong>Contrast:</strong> {data.study.contrast ? 'Yes' : 'No'}</div>
          </div>
        </Card>
      )}
      
      {data.findings && data.findings.length > 0 && (
        <div>
          <h5 className="font-medium mb-2">Findings</h5>
          {data.findings.map((finding: any, index: number) => (
            <Card key={index} className="p-3 mb-2">
              <div className="flex justify-between items-start mb-1">
                <strong className="text-sm">{finding.category}</strong>
                {finding.severity && (
                  <Badge variant={finding.severity === 'severe' ? 'destructive' : 'secondary'}>
                    {finding.severity}
                  </Badge>
                )}
              </div>
              <p className="text-sm">{finding.description}</p>
            </Card>
          ))}
        </div>
      )}
      
      {data.impression && (
        <Card className="p-4">
          <h5 className="font-medium mb-2">Impression</h5>
          <p className="text-sm">{data.impression}</p>
        </Card>
      )}
    </div>
  );

  const renderVitalsData = (data: any) => (
    <div className="space-y-4">
      <h4 className="font-semibold">Vital Signs</h4>
      {data.vitals?.map((vital: any, index: number) => (
        <Card key={index} className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-medium capitalize">
                {vital.type.replace('_', ' ')}
              </h5>
              <p className="text-lg font-semibold">
                {vital.value} {vital.unit}
              </p>
            </div>
            {vital.timestamp && (
              <div className="text-sm text-muted-foreground">
                {new Date(vital.timestamp).toLocaleString()}
              </div>
            )}
          </div>
          {vital.notes && (
            <p className="text-sm text-muted-foreground mt-2">{vital.notes}</p>
          )}
        </Card>
      ))}
    </div>
  );

  const renderGeneralData = (data: any) => (
    <div className="space-y-4">
      <h4 className="font-semibold">Document Sections</h4>
      {data.sections?.map((section: any, index: number) => (
        <Card key={index} className="p-4">
          <h5 className="font-medium mb-2">{section.title}</h5>
          <p className="text-sm">{section.content}</p>
          {section.category && (
            <Badge variant="outline" className="mt-2">{section.category}</Badge>
          )}
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">{report.title}</h3>
          <p className="text-muted-foreground">
            {report.facility_name && `${report.facility_name} • `}
            {new Date(report.report_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {report.file_url && (
            <Button variant="outline" size="sm" onClick={handleViewOriginal}>
              <Eye className="h-4 w-4 mr-2" />
              View Original
            </Button>
          )}
        </div>
      </div>

      {/* Status and Confidence */}
      <div className="flex items-center gap-4">
        <Badge variant={
          report.parsing_status === 'completed' ? 'default' :
          report.parsing_status === 'processing' ? 'secondary' : 'destructive'
        }>
          {report.parsing_status}
        </Badge>
        {report.parsing_confidence && (
          <div className="text-sm text-muted-foreground">
            Confidence: {Math.round(report.parsing_confidence * 100)}%
          </div>
        )}
      </div>

      <Separator />

      {/* Structured Data */}
      {(() => {
        const structuredData = getStructuredData();
        
        if (structuredData) {
          return (
            <div>
              <h4 className="font-semibold mb-4">
                {report.parsed_data ? 'Structured Data' : 'Processed Data'}
              </h4>
              {renderStructuredData(structuredData)}
            </div>
          );
        }

        if (report.extracted_text) {
          return (
            <div>
              <h4 className="font-semibold mb-4">Extracted Text</h4>
              <Card className="p-4">
                <pre className="whitespace-pre-wrap text-sm">{report.extracted_text}</pre>
              </Card>
            </div>
          );
        }

        return (
          <div className="text-center py-8 text-muted-foreground">
            {report.parsing_status === 'pending' ? 
              'Document processing pending...' :
              'No data extracted from document'
            }
          </div>
        );
      })()}
    </div>
  );
}