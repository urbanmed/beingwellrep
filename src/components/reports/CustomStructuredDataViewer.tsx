import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

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

  const renderTestValue = (test: any) => {
    if (typeof test === 'object' && test.result !== undefined) {
      const statusColor = test.status === 'normal' ? 'text-green-600' : 
                         test.status === 'high' || test.status === 'low' ? 'text-yellow-600' : 
                         test.status === 'critical' ? 'text-red-600' : 'text-gray-600';
      
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{test.result} {test.units}</span>
            <Badge variant={test.status === 'normal' ? 'default' : 'secondary'} className={statusColor}>
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

  return (
    <div className="space-y-6">
      {/* Patient Information Section */}
      {hasNewFormat && patient && (
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              {patient.name && (
                <div>
                  <span className="font-medium text-muted-foreground">Name:</span>
                  <div>{patient.name}</div>
                </div>
              )}
              {patient.id && (
                <div>
                  <span className="font-medium text-muted-foreground">Patient ID:</span>
                  <div>{patient.id}</div>
                </div>
              )}
              {reportDate && (
                <div>
                  <span className="font-medium text-muted-foreground">Report Date:</span>
                  <div>{reportDate}</div>
                </div>
              )}
              {visitDate && (
                <div>
                  <span className="font-medium text-muted-foreground">Visit Date:</span>
                  <div>{visitDate}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Information Section */}
      {hasNewFormat && (facility || provider) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Medical Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {facility && (
                <div>
                  <span className="font-medium text-muted-foreground">Facility:</span>
                  <div>{facility}</div>
                </div>
              )}
              {provider && (
                <div>
                  <span className="font-medium text-muted-foreground">Provider:</span>
                  <div>{provider}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lab Test Results Section */}
      {hasNewFormat && sections && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Lab Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {sections.map((section, index) => (
                <div key={index} className="border rounded-lg p-4">
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
                                <Badge variant={test.status === 'normal' ? 'default' : 'secondary'} 
                                       className={test.status === 'normal' ? 'text-green-600' : 
                                                 test.status === 'high' || test.status === 'low' ? 'text-yellow-600' : 
                                                 test.status === 'critical' ? 'text-red-600' : 'text-gray-600'}>
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
        </>
      )}
    </div>
  );
}