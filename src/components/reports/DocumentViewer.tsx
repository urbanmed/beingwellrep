import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Eye, Download, ExternalLink } from "lucide-react";
import type { ParsedMedicalData } from "@/types/medical-data";
import { PatientInfoCard } from "./PatientInfoCard";
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

  // Multi-strategy approach to extract structured data with enhanced error recovery
  const getStructuredData = (): ParsedMedicalData | null => {
    try {
      // Multiple strategies for extracting structured data
      const strategies = [
        // Strategy 1: Check rawResponse in parsed_data
        () => {
          if (typeof report.parsed_data === 'object' && 'rawResponse' in report.parsed_data) {
            const rawResponse = (report.parsed_data as any).rawResponse;
            console.log('Strategy 1: Found rawResponse in parsed_data:', rawResponse);
            
            if (typeof rawResponse === 'string') {
              const parsedFromRaw = parseExtractedTextAsJSON(rawResponse);
              if (parsedFromRaw) {
                const transformedData = transformLabReportData(parsedFromRaw);
                if (transformedData && transformedData.tests && transformedData.tests.length > 0) {
                  console.log('Strategy 1: Successfully transformed lab data from rawResponse');
                  return transformedData;
                }
                
                const fallbackData = createFallbackDataStructure(parsedFromRaw);
                console.log('Strategy 1: Created fallback structure from rawResponse');
                return fallbackData;
              }
            }
          }
          return null;
        },

        // Strategy 2: Try parsed_data directly
        () => {
          if (report.parsed_data) {
            console.log('Strategy 2: Using parsed_data directly:', report.parsed_data);
            
            // Try to transform as lab data first
            const transformedData = transformLabReportData(report.parsed_data);
            if (transformedData && transformedData.tests && transformedData.tests.length > 0) {
              console.log('Strategy 2: Successfully transformed lab data from parsed_data');
              return transformedData;
            }
            
            // Check if it's already structured medical data
            if (report.parsed_data.reportType || 
                (report.parsed_data as any).tests || 
                (report.parsed_data as any).patient) {
              console.log('Strategy 2: Found existing structured data');
              return report.parsed_data;
            }
            
            // Create fallback structure
            const fallbackData = createFallbackDataStructure(report.parsed_data);
            console.log('Strategy 2: Created fallback structure from parsed_data');
            return fallbackData;
          }
          return null;
        },

        // Strategy 3: Parse extracted_text
        () => {
          if (report.extracted_text) {
            console.log('Strategy 3: Parsing extracted_text:', report.extracted_text.substring(0, 200) + '...');
            
            const parsedFromText = parseExtractedTextAsJSON(report.extracted_text);
            if (parsedFromText) {
              const transformedData = transformLabReportData(parsedFromText);
              if (transformedData && transformedData.tests && transformedData.tests.length > 0) {
                console.log('Strategy 3: Successfully transformed lab data from extracted_text');
                return transformedData;
              }
              
              const fallbackData = createFallbackDataStructure(parsedFromText);
              console.log('Strategy 3: Created fallback structure from extracted_text');
              return fallbackData;
            }
          }
          return null;
        },

        // Strategy 4: Fallback to raw extracted text
        () => {
          if (report.extracted_text) {
            console.log('Strategy 4: Using raw extracted text as fallback');
            return createFallbackDataStructure(report.extracted_text);
          }
          return null;
        }
      ];

      // Try each strategy until one succeeds
      for (let i = 0; i < strategies.length; i++) {
        console.log(`Attempting data extraction strategy ${i + 1}`);
        const result = strategies[i]();
        if (result) {
          console.log(`Strategy ${i + 1} succeeded:`, result);
          return result;
        }
      }

      console.warn('All data extraction strategies failed');
      return null;
    } catch (error) {
      console.error('Error in getStructuredData:', error);
      
      // Last resort: create a basic error structure
      return {
        reportType: 'general',
        sections: [{
          title: 'Parsing Error',
          content: `Failed to parse document data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          category: 'error'
        }],
        confidence: 0.1,
        extractedAt: new Date().toISOString()
      } as any;
    }
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

  const renderPatientInfo = (patient: any) => {
    return <PatientInfoCard patient={patient} />;
  };

  const renderLabData = (data: any) => (
    <div className="space-y-4">
      {/* Patient Information */}
      {renderPatientInfo(data.patient)}
      
      {/* Lab Metadata */}
      {(data.facility || data.orderingPhysician || data.collectionDate) && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-4 text-lg">Lab Information</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.facility && (
                  <div className="flex flex-col space-y-1">
                    <Label className="text-muted-foreground">Facility</Label>
                    <span className="font-medium">{data.facility}</span>
                  </div>
                )}
                {data.orderingPhysician && (
                  <div className="flex flex-col space-y-1">
                    <Label className="text-muted-foreground">Ordering Physician</Label>
                    <span className="font-medium">{data.orderingPhysician}</span>
                  </div>
                )}
                {data.collectionDate && (
                  <div className="flex flex-col space-y-1">
                    <Label className="text-muted-foreground">Collection Date</Label>
                    <span className="font-medium">{new Date(data.collectionDate).toLocaleDateString()}</span>
                  </div>
                )}
                {data.reportDate && (
                  <div className="flex flex-col space-y-1">
                    <Label className="text-muted-foreground">Report Date</Label>
                    <span className="font-medium">{new Date(data.reportDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      <div>
        <h4 className="font-semibold mb-4">Test Results</h4>
        <div className="space-y-3">
          {data.tests?.map((test: any, index: number) => (
            <Card 
              key={index} 
              className={`p-4 ${test.isProfileHeader ? 'bg-muted/50' : ''} ${test.isSubTest ? 'ml-4 border-l-4 border-primary/20' : ''}`}
            >
              {test.isProfileHeader ? (
                <div>
                  <h5 className="font-semibold text-lg">{test.name}</h5>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <h5 className={`font-medium ${test.isSubTest ? 'text-base' : 'text-lg'}`}>
                      {test.name}
                    </h5>
                    {test.status && test.status !== 'normal' && (
                      <Badge variant={
                        test.status === 'critical' ? 'destructive' :
                        test.status === 'abnormal' || test.status === 'high' || test.status === 'low' ? 'secondary' : 'default'
                      }>
                        {test.status}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Result:</span>
                      <p className="font-semibold text-lg">
                        {test.value} {test.unit && <span className="text-sm font-normal">{test.unit}</span>}
                      </p>
                    </div>
                    {test.referenceRange && (
                      <div>
                        <span className="font-medium text-muted-foreground">Reference Range:</span>
                        <p className="font-medium">{test.referenceRange}</p>
                      </div>
                    )}
                  </div>
                  
                  {test.notes && (
                    <div className="mt-3 p-3 bg-muted/30 rounded">
                      <span className="font-medium text-muted-foreground">
                        {test.notes.toLowerCase().includes('interpretation') ? 'Interpretation:' : 'Notes:'}
                      </span>
                      <p className="text-sm mt-1">{test.notes}</p>
                    </div>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPrescriptionData = (data: any) => (
    <div className="space-y-4">
      {/* Patient Information */}
      {renderPatientInfo(data.patient)}
      
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
      {/* Patient Information */}
      {renderPatientInfo(data.patient)}
      
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
      {/* Patient Information */}
      {renderPatientInfo(data.patient)}
      
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

  const renderGeneralData = (data: any) => {
    // For lab data that couldn't be properly structured
    if (data.tests && Array.isArray(data.tests) && data.tests.length > 0) {
      return renderLabData(data);
    }

    return (
      <div className="space-y-4">
        {/* Patient Information */}
        {renderPatientInfo(data.patient)}
        
        {/* Document Sections */}
        {data.sections && data.sections.length > 0 ? (
          <div>
            <h4 className="font-semibold mb-4">Document Information</h4>
            <div className="space-y-4">
              {data.sections.map((section: any, index: number) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium text-lg">{section.title}</h5>
                        {section.category && (
                          <Badge variant="outline">{section.category}</Badge>
                        )}
                      </div>
                      
                      {/* Format content based on category */}
                      {section.category === 'object' ? (
                        <div className="space-y-2">
                          {section.content.split('\n').map((line: string, lineIndex: number) => {
                            const [label, ...valueParts] = line.split(':');
                            const value = valueParts.join(':').trim();
                            return (
                              <div key={lineIndex} className="flex flex-col space-y-1">
                                <Label className="text-muted-foreground">{label.trim()}</Label>
                                <span className="font-medium">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : section.category === 'list' ? (
                        <div className="space-y-2">
                          {section.content.split('\n').map((item: string, itemIndex: number) => (
                            <div key={itemIndex} className="p-2 bg-muted/30 rounded text-sm">
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="font-medium">{section.content}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Raw JSON Data Display */
          <div>
            <h4 className="font-semibold mb-4">Document Data</h4>
            <Card className="p-4">
              <div className="space-y-4">
                {Object.entries(data).map(([key, value]) => {
                  if (key === 'patient' || key === 'reportType' || key === 'confidence' || key === 'extractedAt') {
                    return null; // Skip these as they're handled elsewhere
                  }
                  
                  return (
                    <div key={key}>
                      <h5 className="font-medium mb-2 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </h5>
                      {typeof value === 'object' && value !== null ? (
                        <Card className="p-3 bg-muted/30">
                          <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        </Card>
                      ) : (
                        <p className="text-sm">{String(value)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

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