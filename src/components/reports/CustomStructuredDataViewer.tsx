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
    tests?: Array<{
      name: string;
      value: string;
      unit: string;
      referenceRange: string;
      status: string;
      section?: string;
      notes?: string;
    }>; // Direct tests array from backend
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
    extracted_text?: string; // Raw extracted text for fallback parsing
    confidence?: number;
  } | null;
  extractedText?: string | null; // Separate prop for raw extracted text
}

export function CustomStructuredDataViewer({ parsedData, extractedText }: CustomStructuredDataViewerProps) {
  console.info("CustomStructuredDataViewer rendering with:", { parsedData, extractedTextLength: extractedText?.length });
  const isMobile = useIsMobile();
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});

  // IMMEDIATE FIX: Enhanced helper function to parse test results from continuous OCR text
  const parseTestsFromRawText = (text: string) => {
    if (!text) return [];
    
    console.log('🔍 Frontend parsing text length:', text.length);
    
    // IMMEDIATE FIX: Intelligent text preprocessing for continuous OCR format
    let processedText = text
      // Add line breaks before test patterns
      .replace(/([a-zA-Z\s]+)\s+(Method\s*:)/gi, '\n$1 $2')
      .replace(/([a-zA-Z\s]+)\s*:\s*([\d.,]+)/g, '\n$1 : $2')
      // Add line breaks before common lab test names
      .replace(/(Uric\s+Acid|Glucose|Hemoglobin|Cholesterol|TSH|Creatinine|Albumin|Bilirubin|Protein|Sodium|Potassium|Chloride|Neutrophils|Lymphocytes|Monocytes|Eosinophils|Basophils)/gi, '\n$1')
      // Clean up multiple newlines
      .replace(/\n+/g, '\n')
      .trim();
    
    const lines = processedText.split('\n').map(line => line.trim()).filter(Boolean);
    const tests: any[] = [];
    
    // IMMEDIATE FIX: Enhanced cascading patterns with continuous text handling
    const testPatterns = [
      // Pattern 1: Method with complex description - handles continuous format
      /(?:^|\s)([A-Za-z\s\-\/]{3,40})\s+Method\s*:\s*([^:]+?)\s*:\s*([\d.,]+)\s*([a-zA-Z\/\sd%μλ]+)\s*([\d\s\-<>≤≥.,\/():=±Children:Birth\w\-\.]+)/gi,
      
      // Pattern 2: Direct test result with embedded text
      /(?:^|\s)([A-Za-z\s\-\/]{3,40})\s*:\s*([\d.,]+)\s*([a-zA-Z\/\sd%μλ]+)\s*([\d\s\-<>≤≥.,\/():=±Children:Birth\w\-\.]+)/gi,
      
      // Pattern 3: Test name with units separated - handles embedded interpretation
      /(?:^|\s)([A-Za-z\s\-\/]{3,40})\s+([\d.,]+)\s+([a-zA-Z\/\sd%μλ]+)\s+([\d\s\-<>≤≥.,\/():=±]+)/gi,
      
      // Pattern 4: Percentage values with interpretation
      /(?:^|\s)([A-Za-z\s\-\/]{3,40})\s*:\s*([\d.,]+)\s*%\s*([\d\s\-<>≤≥.,\/():=±Normal]+)/gi,
      
      // Pattern 5: Simple format without colons
      /(?:^|\s)(Uric\s+Acid|Glucose|Hemoglobin|Cholesterol|TSH|Creatinine|Albumin|Bilirubin|Protein|Sodium|Potassium|Chloride|Neutrophils|Lymphocytes|Monocytes|Eosinophils|Basophils)\s+([\d.,]+)\s+([a-zA-Z\/\sd%μλ]+)\s+([\d\s\-<>≤≥.,\/():=±]+)/gi
    ];
    
    // Process each line for multiple matches
    for (const line of lines) {
      // Skip header lines and non-test content
      if (line.match(/^(TEST NAME|RESULT|UNITS|BIOLOGICAL REFERENCE|Page \d+|Print Date|Client Req|Phone|Age|Gender|Patient Name|Received On|Registered On|Collected On|Sample Type|LAB|Ref\.Dr|Processing Location|Report Status|Email|\*\*End Of Report\*\*|Dr\.|Note|Reference|Interpretation)/i)) {
        continue;
      }
      
      // Try each pattern and collect all matches
      for (let i = 0; i < testPatterns.length; i++) {
        const matches = Array.from(line.matchAll(testPatterns[i]));
        
        for (const match of matches) {
          let testName: string;
          let value: string;
          let unit: string;
          let range: string;

          if (i === 0) {
            // Method pattern
            testName = match[1].trim();
            value = match[3];
            unit = match[4].trim();
            range = match[5].trim();
          } else if (i === 3) {
            // Percentage pattern
            testName = match[1].trim();
            value = match[2];
            unit = '%';
            range = match[3].trim();
          } else if (i === 4) {
            // Simple format pattern
            testName = match[1].trim();
            value = match[2];
            unit = match[3].trim();
            range = match[4].trim();
          } else {
            // Standard patterns
            testName = match[1].trim();
            value = match[2];
            unit = match[3]?.trim() || '';
            range = match[4]?.trim() || '';
          }

          // IMMEDIATE FIX: Enhanced data cleaning and validation
          testName = testName
            .replace(/\s*Method\s*:.*$/i, '')
            .replace(/^(Mr\.|Mrs\.|Ms\.)\s*/i, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          unit = unit
            .replace(/\s+/g, '')
            .replace(/d\s*L/gi, 'dL')
            .replace(/m\s*L/gi, 'mL')
            .replace(/μ/g, 'u');
          
          range = range
            .replace(/Normal\s*:\s*/i, '')
            .replace(/Desirable\s*:\s*/i, '')
            .replace(/Children:\s*/i, '')
            .replace(/Birth-\d+\s*d:\s*/i, '')
            .trim();
          
          // Enhanced validation
          const isValidTest = testName && 
            value && 
            !isNaN(parseFloat(value)) &&
            testName.length > 2 && 
            testName.length < 50 &&
            !testName.match(/^(Page|Print|Date|Received|Registered|Client|Phone|Processing|Email|Address|TEST NAME|RESULT|UNITS|BIOLOGICAL|End Of Report|Note|Reference|Interpretation|Normal|Abnormal|High|Low)$/i) &&
            !testName.match(/^\d+$/);
          
          if (isValidTest) {
            const numericValue = parseFloat(value);
            const status = determineTestStatusFrontend(numericValue, range);
            
            // Check for duplicates
            const isDuplicate = tests.some(existing => 
              existing.name.toLowerCase() === testName.toLowerCase() &&
              existing.value === value.trim()
            );
            
            if (!isDuplicate) {
              tests.push({
                name: testName,
                value: value,
                unit: unit,
                referenceRange: range,
                status: status
              });
              console.log('✅ Frontend parsed test:', { testName, value, unit, range, status });
            }
          }
        }
      }
    }
    
    console.log('🎯 Frontend extracted', tests.length, 'tests total');
    return tests;
  };

  // IMMEDIATE FIX: Enhanced frontend status determination function
  const determineTestStatusFrontend = (value: number, range: string): string => {
    if (!range || range.trim() === '') return 'normal';
    
    // Enhanced range patterns with better parsing
    const rangePatterns = [
      // Standard range: "3.5-7.2", "13.0-17.0"
      /(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/,
      // Less than: "< 200", "< 100"
      /<\s*(\d+\.?\d*)/,
      // Greater than: "> 60", ">= 240"
      />(?:=)?\s*(\d+\.?\d*)/,
      // Range with descriptors: "70 - 100", "Normal : 70 - 100"
      /(\d+\.?\d*)\s*-?\s*(\d+\.?\d*)/,
      // Age-specific ranges: "21-54 y:0.4-4.2"
      /(\d+\.?\d*)-(\d+\.?\d*)/
    ];
    
    for (const pattern of rangePatterns) {
      const match = range.match(pattern);
      if (match) {
        if (pattern.source.includes('-') && match[2]) {
          // Range format
          const lower = parseFloat(match[1]);
          const upper = parseFloat(match[2]);
          if (!isNaN(lower) && !isNaN(upper)) {
            if (value < lower) return 'low';
            if (value > upper) return 'high';
            return 'normal';
          }
        } else if (pattern.source.includes('<')) {
          // Less than format
          const threshold = parseFloat(match[1]);
          if (!isNaN(threshold)) {
            return value <= threshold ? 'normal' : 'high';
          }
        } else if (pattern.source.includes('>')) {
          // Greater than format
          const threshold = parseFloat(match[1]);
          if (!isNaN(threshold)) {
            return value >= threshold ? 'normal' : 'low';
          }
        }
      }
    }
    
    return 'normal';
  };

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
    console.info("🔄 Converting markdown to structured format:", { 
      extractedData: parsedData.extractedData,
      rawExtractedTextLength: extractedText?.length 
    });
    const convertedData = convertMarkdownToStructured(parsedData.extractedData, extractedText);
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

  const { patient, facility, provider, reportDate, visitDate, sections, tests } = displayData;

  // Helper function to check if we have meaningful data to display
  const hasMeaningfulData = () => {
    // Check for direct tests array
    if (tests && Array.isArray(tests) && tests.length > 0) {
      return true;
    }
    
    // Check if we can parse tests from raw text
    const rawTests = parseTestsFromRawText(extractedText || '');
    if (rawTests.length > 0) {
      return true;
    }
    
    // Check for sections with content
    if (sections && Array.isArray(sections)) {
      return sections.some(section => 
        section.content && 
        section.content.trim() !== '' && 
        !section.content.toLowerCase().includes('no test results') &&
        !section.content.toLowerCase().includes('not found')
      );
    }
    
    return false;
  };

  // Check if we have any meaningful data to display
  const hasPatientInfo = patient && (patient.name || patient.id);
  const hasFacilityInfo = facility || provider;
  const hasSections = sections && sections.length > 0;
  const hasLabTests = tests && tests.length > 0;
  const hasAnyData = hasPatientInfo || hasFacilityInfo || hasSections || hasLabTests || hasMeaningfulData();

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

      {/* Laboratory Results from direct tests array or parsed from raw text */}
      {(() => {
        // Use direct tests if available, otherwise parse from raw text
        const testResults = (tests && Array.isArray(tests) && tests.length > 0) 
          ? tests 
          : parseTestsFromRawText(extractedText || '');
        
        if (testResults.length === 0) return null;
        
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Laboratory Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testResults.map((test: any, testIndex: number) => (
                  <div key={testIndex} className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg border">
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-foreground">
                        {test.name}: <span className="font-semibold text-primary">{test.value} {test.unit}</span>
                        {test.referenceRange && (
                          <span className="text-muted-foreground ml-2">({test.referenceRange})</span>
                        )}
                      </div>
                      {(test.notes || test.method) && (
                        <div className="text-sm text-muted-foreground">
                          {test.notes || (test.method ? `Method: ${test.method}` : '')}
                        </div>
                      )}
                    </div>
                    <Badge variant={getStatusBadgeVariant(test.status)} className="ml-2">
                      {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Laboratory Results Section */}
      {hasSections && sections.map((section, index) => {
        const isLabSection = section.category === 'laboratory' || section.category === 'Lab Tests' || section.title.toLowerCase().includes('lab');
        
        console.log('🔍 Rendering section:', { title: section.title, category: section.category, contentType: typeof section.content, contentLength: Array.isArray(section.content) ? section.content.length : 'not array' });
        
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
                  {labTests.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No laboratory test results found in this report.</p>
                    </div>
                  ) : (
                    labTests.map((test: any, testIndex: number) => (
                      <div key={testIndex} className="flex flex-col gap-2 p-3 bg-secondary/30 border rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-foreground">{test.testName || 'Unknown Test'}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-base font-semibold text-primary">
                                {test.result || 'N/A'}
                                {test.units && <span className="text-sm font-normal ml-1">{test.units}</span>}
                              </span>
                              {test.status && test.status !== 'Normal' && (
                                <Badge variant={getStatusBadgeVariant(test.status)} className="text-xs">
                                  {test.status}
                                </Badge>
                              )}
                              {(!test.status || test.status === 'Normal') && (
                                <Badge variant="secondary" className="text-xs">
                                  Normal
                                </Badge>
                              )}
                            </div>
                            {test.referenceRange && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Reference Range: {test.referenceRange}
                              </div>
                            )}
                            {test.category && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Category: {test.category}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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