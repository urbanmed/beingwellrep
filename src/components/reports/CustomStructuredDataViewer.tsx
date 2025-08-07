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
  };
}

export function CustomStructuredDataViewer({ parsedData }: CustomStructuredDataViewerProps) {
  const isMobile = useIsMobile();
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});

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

  if (!patient && !facility && !provider && (!sections || sections.length === 0)) {
    return null;
  }


  const toggleSection = (index: number) => {
    setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'normal':
        return 'normal';
      case 'high':
      case 'low':
        return 'warning';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const renderTestValue = (test: any) => {
    if (typeof test === 'object' && test.result !== undefined) {
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="font-medium text-xs">{test.result} {test.units}</span>
            <Badge variant={getStatusBadgeVariant(test.status)} className="text-xs px-1.5 py-0.5">
              {test.status}
            </Badge>
          </div>
          {test.referenceRange && (
            <span className="text-xs text-muted-foreground">
              Ref: {test.referenceRange}
            </span>
          )}
        </div>
      );
    }
    return <span className="text-xs">{test}</span>;
  };

  const renderMobileLabCard = (test: any, testIndex: number) => (
    <Card key={testIndex} className="p-2">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h5 className="font-medium text-xs leading-tight">{test.testName}</h5>
          <Badge variant={getStatusBadgeVariant(test.status)} className="text-xs px-1.5 py-0.5 shrink-0">
            {test.status}
          </Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Result:</span>
            <span className="font-medium text-xs">{test.result} {test.units}</span>
          </div>
          {(test.referenceRange || test.referenceInterval) && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Reference:</span>
              <span className="text-xs">{test.referenceRange || test.referenceInterval}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className={`space-y-4 ${isMobile ? 'px-0' : 'space-y-6'}`}>
      {/* Patient Information Section */}
      {patient && (
        <Card>
          <CardHeader className={isMobile ? "pb-2" : "pb-3"}>
            <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2 flex-wrap`}>
              Patient Information
              <Badge variant="secondary" className="text-xs">
                Confidence: {Math.round((parsedData.confidence || 0) * 100)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "pt-0" : ""}>
            <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-4'} text-sm`}>
              {patient.name && (
                <div>
                  <span className="font-medium text-muted-foreground">Name:</span>
                  <div className={isMobile ? "mt-1" : ""}>{patient.name}</div>
                </div>
              )}
              {patient.id && (
                <div>
                  <span className="font-medium text-muted-foreground">Patient ID:</span>
                  <div className={isMobile ? "mt-1" : ""}>{patient.id}</div>
                </div>
              )}
              {reportDate && (
                <div>
                  <span className="font-medium text-muted-foreground">Report Date:</span>
                  <div className={isMobile ? "mt-1" : ""}>{reportDate}</div>
                </div>
              )}
              {visitDate && (
                <div>
                  <span className="font-medium text-muted-foreground">Visit Date:</span>
                  <div className={isMobile ? "mt-1" : ""}>{visitDate}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Information Section */}
      {(facility || provider) && (
        <Card>
          <CardHeader className={isMobile ? "pb-2" : "pb-3"}>
            <CardTitle className={isMobile ? "text-base" : "text-lg"}>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "pt-0" : ""}>
            <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-4'} text-sm`}>
              {facility && (
                <div>
                  <span className="font-medium text-muted-foreground">Facility:</span>
                  <div className={isMobile ? "mt-1" : ""}>{facility}</div>
                </div>
              )}
              {provider && (
                <div>
                  <span className="font-medium text-muted-foreground">Provider:</span>
                  <div className={isMobile ? "mt-1" : ""}>{provider}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results Sections */}
      {sections && sections.length > 0 && sections.map((section, sectionIndex) => (
        <Card key={sectionIndex}>
          <CardHeader className={isMobile ? "pb-2" : "pb-3"}>
            <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2 flex-wrap`}>
              {section.title}
              <Badge variant="outline" className="text-xs">
                {section.category}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "pt-0" : ""}>
            {isMobile ? (
              <Collapsible 
                open={openSections[sectionIndex] ?? true} 
                onOpenChange={() => toggleSection(sectionIndex)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-medium text-xs text-left">View Details</h4>
                    </div>
                    <ChevronDown className={`h-3 w-3 transition-transform ${openSections[sectionIndex] ?? true ? 'transform rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-1.5">
                    {Array.isArray(section.content) ? (
                      section.content.map((test: any, testIndex: number) => 
                        renderMobileLabCard(test, testIndex)
                      )
                    ) : typeof section.content === 'object' ? (
                      <div className="space-y-1.5">
                        {Object.entries(section.content).map(([key, value]: [string, any]) => (
                          <Card key={key} className="p-2">
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-medium text-xs capitalize leading-tight">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <div className="text-right">
                                {renderTestValue(value)}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground p-2 border rounded-lg">
                        {section.content}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div>
                {Array.isArray(section.content) ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-border rounded-md">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border border-border px-3 py-2 text-left font-semibold text-sm">Test</th>
                          <th className="border border-border px-3 py-2 text-left font-semibold text-sm">Result</th>
                          <th className="border border-border px-3 py-2 text-left font-semibold text-sm">Reference Range</th>
                          <th className="border border-border px-3 py-2 text-left font-semibold text-sm">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.content.map((test: any, testIndex: number) => (
                          <tr key={testIndex} className="hover:bg-muted/50">
                            <td className="border border-border px-3 py-2 text-sm font-medium">
                              {test.testName}
                            </td>
                            <td className="border border-border px-3 py-2 text-sm">
                              {test.result} {test.units}
                            </td>
                            <td className="border border-border px-3 py-2 text-sm text-muted-foreground">
                              {test.referenceRange || test.referenceInterval}
                            </td>
                            <td className="border border-border px-3 py-2 text-sm">
                              <Badge variant={getStatusBadgeVariant(test.status)}>
                                {test.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : typeof section.content === 'object' ? (
                  <div className="grid gap-3">
                    {Object.entries(section.content).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center p-2 border rounded">
                        <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        {renderTestValue(value)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {section.content}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

    </div>
  );
}