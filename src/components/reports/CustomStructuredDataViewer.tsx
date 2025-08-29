import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { convertMarkdownToStructured } from "@/lib/utils/markdown-to-structured-converter";

interface CustomStructuredDataViewerProps {
  parsedData: {
    reportType?: string;
    patient?: {
      name?: string;
      dateOfBirth?: string;
      id?: string;
      age?: string;
      gender?: string;
    };
    facility?: string;
    provider?: string;
    reportDate?: string;
    visitDate?: string;
    sections?: Array<{
      title: string;
      category: string;
      content: any;
    }>;
    extractedData?: {
      patientInformation?: string;
      hospitalLabInformation?: string;
      labTestResults?: string;
    };
    confidence?: number;
  } | null;
}

export function CustomStructuredDataViewer({ parsedData }: CustomStructuredDataViewerProps) {
  console.log('CustomStructuredDataViewer rendering with:', { parsedData });
  const isMobile = useIsMobile();
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});

  // Handle null parsedData case
  if (!parsedData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">
            <p className="mb-2">Document is still being processed.</p>
            <p className="text-sm">Please check back in a few moments for structured data.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Convert extractedData to structured format if needed
  let displayData = parsedData;
  
  if (parsedData.extractedData && (!parsedData.sections || parsedData.sections.length === 0)) {
    const convertedData = convertMarkdownToStructured(parsedData.extractedData);
    displayData = {
      ...parsedData,
      patient: convertedData.patient || parsedData.patient,
      facility: convertedData.facility || parsedData.facility,
      provider: convertedData.provider || parsedData.provider,
      reportDate: convertedData.reportDate || parsedData.reportDate,
      visitDate: convertedData.visitDate || parsedData.visitDate,
      sections: convertedData.sections
    };
  }

  const { patient, facility, provider, reportDate, visitDate, sections } = displayData;

  // Check if we have any meaningful data to display
  const hasPatientInfo = patient && (patient.name || patient.id);
  const hasFacilityInfo = facility || provider;
  const hasSections = sections && sections.length > 0;
  const hasAnyData = hasPatientInfo || hasFacilityInfo || hasSections;

  if (!hasAnyData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">
            <p className="mb-2">No structured data could be extracted from this document.</p>
            <p className="text-sm">This may be an image-only document or require manual review.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleSection = (index: number) => {
    setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'normal':
        return 'secondary';
      case 'high':
      case 'low':
        return 'outline';
      case 'critical':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Patient Information Card */}
      {hasPatientInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient?.name && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm text-muted-foreground">Patient Name:</span>
                <span className="text-sm font-medium">{patient.name}</span>
              </div>
            )}
            {(patient?.age || patient?.gender) && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm text-muted-foreground">Age/Gender:</span>
                <span className="text-sm font-medium">
                  {patient.age && `${patient.age} Y(s)`}
                  {patient.age && patient.gender && ' / '}
                  {patient.gender}
                </span>
              </div>
            )}
            {patient?.id && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm text-muted-foreground">Patient ID:</span>
                <span className="text-sm font-medium">{patient.id}</span>
              </div>
            )}
            {patient?.dateOfBirth && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm text-muted-foreground">Date of Birth:</span>
                <span className="text-sm">{patient.dateOfBirth}</span>
              </div>
            )}
            {reportDate && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm text-muted-foreground">Report Date:</span>
                <span className="text-sm">{reportDate}</span>
              </div>
            )}
            {visitDate && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm text-muted-foreground">Visit Date:</span>
                <span className="text-sm">{visitDate}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Medical Information Card */}
      {hasFacilityInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {facility && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm text-muted-foreground">Facility:</span>
                <span className="text-sm font-medium">{facility}</span>
              </div>
            )}
            {provider && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm text-muted-foreground">Doctor:</span>
                <span className="text-sm font-medium">{provider}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Laboratory Results Section */}
      {hasSections && sections.map((section, index) => {
        const isLabSection = section.category === 'laboratory' || section.category === 'Lab Tests' || section.title.toLowerCase().includes('lab');
        
        // Handle laboratory results specially
        if (isLabSection && Array.isArray(section.content)) {
          const labTests = section.content;
          
          return (
            <Card key={index}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {section.title || 'Laboratory Results'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {labTests.map((test: any, testIndex: number) => (
                    <div key={testIndex} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-card border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{test.testName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-medium text-primary">
                            {test.result} {test.units}
                          </span>
                          {test.status && (
                            <Badge variant={getStatusBadgeVariant(test.status)} className="text-xs">
                              {test.status}
                            </Badge>
                          )}
                        </div>
                        {test.referenceRange && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Reference: {test.referenceRange}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        }
        
        // Handle other sections
        return (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeof section.content === 'object' && section.content !== null ? (
                <div className="space-y-2">
                  {Object.entries(section.content).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-medium text-sm text-muted-foreground">{key}:</span>
                      <span className="text-sm">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm">{String(section.content)}</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}