import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

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
  const { extractedData, patient, facility, provider, reportDate, visitDate, sections } = parsedData;
  const isMobile = useIsMobile();
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});

  // If we have the new structured format, use it; otherwise fall back to extractedData
  const hasNewFormat = sections && sections.length > 0;
  const hasOldFormat = extractedData && (extractedData.patientInformation || extractedData.hospitalLabInformation || extractedData.labTestResults);

  if (!hasNewFormat && !hasOldFormat) {
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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{test.result} {test.units}</span>
            <Badge variant={getStatusBadgeVariant(test.status)}>
              {test.status}
            </Badge>
          </div>
          {test.referenceRange && (
            <span className="text-xs text-muted-foreground">
              Reference: {test.referenceRange}
            </span>
          )}
        </div>
      );
    }
    return <span>{test}</span>;
  };

  const renderMobileLabCard = (test: any, testIndex: number) => (
    <Card key={testIndex} className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h5 className="font-medium text-sm">{test.testName}</h5>
          <Badge variant={getStatusBadgeVariant(test.status)} className="ml-2">
            {test.status}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Result:</span>
            <span className="font-medium">{test.result} {test.units}</span>
          </div>
          {(test.referenceRange || test.referenceInterval) && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Reference:</span>
              <span className="text-sm">{test.referenceRange || test.referenceInterval}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className={`space-y-4 ${isMobile ? 'px-0' : 'space-y-6'}`}>
      {/* Patient Information Section */}
      {hasNewFormat && patient && (
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
      {hasNewFormat && (facility || provider) && (
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

      {/* Lab Test Results Section */}
      {hasNewFormat && sections && (
        <Card>
          <CardHeader className={isMobile ? "pb-2" : "pb-3"}>
            <CardTitle className={isMobile ? "text-base" : "text-lg"}>Lab Test Results</CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "pt-0" : ""}>
            <div className={isMobile ? "space-y-4" : "space-y-6"}>
              {sections.map((section, index) => (
                <div key={index}>
                  {isMobile ? (
                    <Collapsible 
                      open={openSections[index] ?? true} 
                      onOpenChange={() => toggleSection(index)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm text-left">{section.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {section.category}
                            </Badge>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openSections[index] ?? true ? 'transform rotate-180' : ''}`} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 space-y-2">
                          {Array.isArray(section.content) ? (
                            section.content.map((test: any, testIndex: number) => 
                              renderMobileLabCard(test, testIndex)
                            )
                          ) : typeof section.content === 'object' ? (
                            <div className="space-y-2">
                              {Object.entries(section.content).map(([key, value]: [string, any]) => (
                                <Card key={key} className="p-3">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    {renderTestValue(value)}
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground p-3 border rounded-lg">
                              {section.content}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                        {section.title}
                        <Badge variant="outline" className="text-xs">
                          {section.category}
                        </Badge>
                      </h4>
                      
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback to old format */}
      {!hasNewFormat && extractedData && (
        <>
          {extractedData.patientInformation && (
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
                <div className={`prose prose-sm max-w-none ${isMobile ? 'text-xs' : ''}`}>
                  <ReactMarkdown components={components}>
                    {extractedData.patientInformation}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {extractedData.hospitalLabInformation && (
            <Card>
              <CardHeader className={isMobile ? "pb-2" : "pb-3"}>
                <CardTitle className={isMobile ? "text-base" : "text-lg"}>Medical Information</CardTitle>
              </CardHeader>
              <CardContent className={isMobile ? "pt-0" : ""}>
                <div className={`prose prose-sm max-w-none ${isMobile ? 'text-xs' : ''}`}>
                  <ReactMarkdown components={components}>
                    {extractedData.hospitalLabInformation}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {extractedData.labTestResults && (
            <Card>
              <CardHeader className={isMobile ? "pb-2" : "pb-3"}>
                <CardTitle className={isMobile ? "text-base" : "text-lg"}>Lab Test Results</CardTitle>
              </CardHeader>
              <CardContent className={isMobile ? "pt-0" : ""}>
                <div className={`prose prose-sm max-w-none ${isMobile ? 'text-xs overflow-x-auto' : ''}`}>
                  <ReactMarkdown components={components}>
                    {extractedData.labTestResults}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}