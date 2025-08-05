import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Eye, Download, ExternalLink } from "lucide-react";
import type { ParsedMedicalData } from "@/types/medical-data";
import { PatientInfoCard } from "./PatientInfoCard";
import { DoctorInfoCard } from "./DoctorInfoCard";
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
    console.log('Getting structured data for report:', report.id, 'parsing_status:', report.parsing_status);
    
    try {
      // Strategy 1: Direct JSON parse of rawResponse (highest priority)
      if (report.parsed_data && (report.parsed_data as any).rawResponse) {
        console.log('Strategy 1: Parsing rawResponse directly');
        try {
          const rawResponse = (report.parsed_data as any).rawResponse;
          const rawData = typeof rawResponse === 'string' 
            ? JSON.parse(rawResponse)
            : rawResponse;
          
          console.log('Raw response data:', rawData);
          const transformed = transformLabReportData(rawData);
          if (transformed) {
            console.log('Successfully transformed rawResponse data');
            return transformed;
          }
        } catch (error) {
          console.warn('Failed to parse rawResponse as JSON:', (error as Error).message);
          
          // Try parsing rawResponse as string with extraction
          const rawResponse = (report.parsed_data as any).rawResponse;
          if (typeof rawResponse === 'string') {
            const parsedFromString = parseExtractedTextAsJSON(rawResponse);
            if (parsedFromString) {
              console.log('Successfully parsed rawResponse string');
              const transformed = transformLabReportData(parsedFromString);
              if (transformed) return transformed;
            }
          }
        }
      }

      // Strategy 2: Direct parsed_data
      if (report.parsed_data && typeof report.parsed_data === 'object') {
        console.log('Strategy 2: Using parsed_data directly');
        const transformed = transformLabReportData(report.parsed_data);
        if (transformed) {
          console.log('Successfully transformed parsed_data');
          return transformed;
        }
      }

      // Strategy 3: Parse extracted_text as JSON
      if (report.extracted_text) {
        console.log('Strategy 3: Parsing extracted_text as JSON, length:', report.extracted_text.length);
        const parsedText = parseExtractedTextAsJSON(report.extracted_text);
        if (parsedText) {
          console.log('Successfully parsed extracted_text, keys:', Object.keys(parsedText));
          const transformed = transformLabReportData(parsedText);
          if (transformed) {
            console.log('Successfully transformed extracted_text data');
            return transformed;
          }
        }
      }

      // Strategy 4: Try to extract partial data from extracted_text
      if (report.extracted_text) {
        console.log('Strategy 4: Attempting fallback data structure from extracted_text');
        const fallbackData = createFallbackDataStructure({ extracted_text: report.extracted_text });
        if (fallbackData) {
          console.log('Created fallback data structure');
          return fallbackData;
        }
      }

      console.log('No structured data could be extracted from any strategy');
      return null;
    } catch (error) {
      console.error('Error in getStructuredData:', error);
      return null;
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
      
      {/* Doctor/Facility Information */}
      <DoctorInfoCard 
        facility={data.facility}
        orderingPhysician={data.orderingPhysician}
        collectionDate={data.collectionDate}
        reportDate={data.reportDate}
      />

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
      
      {/* Doctor/Facility Information */}
      <DoctorInfoCard 
        facility={data.facility}
        orderingPhysician={data.orderingPhysician || data.prescribingPhysician}
        reportDate={data.prescriptionDate || data.reportDate}
      />
      
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
      
      {/* Doctor/Facility Information */}
      <DoctorInfoCard 
        facility={data.facility}
        orderingPhysician={data.orderingPhysician || data.radiologist}
        reportDate={data.studyDate || data.reportDate}
      />
      
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
      
      {/* Doctor/Facility Information */}
      <DoctorInfoCard 
        facility={data.facility}
        orderingPhysician={data.orderingPhysician || data.recordingPhysician}
        reportDate={data.recordDate || data.reportDate}
      />
      
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
        
        {/* Doctor/Facility Information */}
        <DoctorInfoCard 
          facility={data.facility}
          orderingPhysician={data.orderingPhysician || data.physician}
          reportDate={data.reportDate}
        />
        
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