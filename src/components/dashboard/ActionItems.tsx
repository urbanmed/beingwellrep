import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface FlaggedResult {
  id: string;
  testName: string;
  value: string;
  status: 'critical' | 'high' | 'low' | 'abnormal';
  referenceRange?: string;
  reportId: string;
  reportTitle: string;
  reportDate: string;
  severity: 'critical' | 'warning' | 'info';
}

export function ActionItems() {
  const { reports } = useReports();
  const navigate = useNavigate();

  const flaggedResults = useMemo(() => {
    const flagged: FlaggedResult[] = [];
    
    // Extract flagged results from recent reports
    const recentReports = reports
      .filter(r => r.parsing_status === 'completed' && r.parsed_data)
      .slice(0, 20); // Check last 20 reports
    
    for (const report of recentReports) {
      try {
        const data = typeof report.parsed_data === 'string' 
          ? JSON.parse(report.parsed_data) 
          : report.parsed_data;
        
        // Check lab results with enhanced parsing
        if (data?.tests) {
          data.tests.forEach((test: any) => {
            const status = normalizeTestStatus(test.status);
            if (status && ['critical', 'high', 'low', 'abnormal'].includes(status)) {
              const severity = determineSeverityLevel(status);
              
              flagged.push({
                id: `${report.id}-${test.name}`,
                testName: test.name,
                value: test.value + (test.unit ? ` ${test.unit}` : ''),
                status: status as any,
                referenceRange: test.referenceRange || test.reference_range || test.refRange,
                reportId: report.id,
                reportTitle: report.title || 'Medical Report',
                reportDate: report.report_date,
                severity
              });
            }
          });
        }
        
        // Check vitals with enhanced parsing
        if (data?.vitals) {
          data.vitals.forEach((vital: any) => {
            const status = normalizeTestStatus(vital.status);
            if (status && ['critical', 'high', 'low', 'abnormal'].includes(status)) {
              const severity = determineSeverityLevel(status);
              
              flagged.push({
                id: `${report.id}-${vital.type}`,
                testName: vital.type.replace(/_/g, ' '),
                value: vital.value + (vital.unit ? ` ${vital.unit}` : ''),
                status: status as any,
                reportId: report.id,
                reportTitle: report.title || 'Medical Report',
                reportDate: report.report_date,
                severity
              });
            }
          });
        }
        
        // Enhanced parsing for raw response data
        if (data?.rawResponse && typeof data.rawResponse === 'string') {
          const extractedResults = parseAbnormalFromText(data.rawResponse, report);
          flagged.push(...extractedResults);
        }
        
        // Check sections for general documents
        if (data?.sections && Array.isArray(data.sections)) {
          data.sections.forEach((section: any) => {
            if (section.content) {
              const extractedResults = parseAbnormalFromText(section.content, report);
              flagged.push(...extractedResults);
            }
          });
        }
        
      } catch (error) {
        console.warn('Error parsing action items from report:', error);
        
        // Fallback: try to parse the raw data as text
        if (report.extracted_text) {
          try {
            const extractedResults = parseAbnormalFromText(report.extracted_text, report);
            flagged.push(...extractedResults);
          } catch (textError) {
            console.warn('Failed to parse extracted text for action items:', textError);
          }
        }
      }
    }
    
    // Sort by severity and date
    return flagged
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
      })
      .slice(0, 5); // Show top 5 most important
  }, [reports]);

  // Helper functions for enhanced parsing
  const normalizeTestStatus = (status: string | undefined): string | null => {
    if (!status) return null;
    
    const normalized = status.toLowerCase().trim();
    if (normalized.includes('critical') || normalized.includes('severe')) return 'critical';
    if (normalized.includes('high') || normalized.includes('elevated') || normalized.includes('abnormal')) return 'high';
    if (normalized.includes('low') || normalized.includes('decreased')) return 'low';
    if (normalized.includes('normal')) return null; // Don't include normal results
    
    return null;
  };

  const determineSeverityLevel = (status: string): 'critical' | 'warning' | 'info' => {
    switch (status.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high':
      case 'low': return 'warning';
      default: return 'info';
    }
  };

  const parseAbnormalFromText = (text: string, report: any): FlaggedResult[] => {
    const results: FlaggedResult[] = [];
    
    // Simple pattern matching for abnormal values
    const abnormalPatterns = [
      /([A-Za-z\s]+)\s*:\s*([0-9.]+)\s*([A-Za-z/%]*).*(high|low|elevated|decreased|abnormal|critical)/gi,
      /(high|low|elevated|decreased|abnormal|critical).+?([A-Za-z\s]+)\s*:\s*([0-9.]+)/gi
    ];
    
    for (const pattern of abnormalPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        try {
          const isSecondPattern = match[1] && ['high', 'low', 'elevated', 'decreased', 'abnormal', 'critical'].includes(match[1].toLowerCase());
          
          const testName = isSecondPattern ? match[2]?.trim() : match[1]?.trim();
          const value = isSecondPattern ? match[3] : match[2];
          const unit = isSecondPattern ? '' : match[3] || '';
          const status = isSecondPattern ? match[1]?.toLowerCase() : match[4]?.toLowerCase();
          
          if (testName && value && status) {
            const normalizedStatus = normalizeTestStatus(status);
            if (normalizedStatus) {
              results.push({
                id: `${report.id}-${testName}-${Date.now()}`,
                testName: testName,
                value: value + (unit ? ` ${unit}` : ''),
                status: normalizedStatus as any,
                reportId: report.id,
                reportTitle: report.title || 'Medical Report',
                reportDate: report.report_date,
                severity: determineSeverityLevel(normalizedStatus)
              });
            }
          }
        } catch (parseError) {
          console.warn('Error parsing abnormal result from text:', parseError);
        }
      }
    }
    
    return results;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return AlertTriangle;
      case 'high': return TrendingUp;
      case 'low': return TrendingDown;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'warning';
      default: return 'secondary';
    }
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/reports/${reportId}`);
  };

  if (flaggedResults.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="medical-heading-sm flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-primary" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="medical-annotation text-center py-4">
            No flagged results found in your recent reports
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 text-primary" />
          Action Items
          <Badge variant="secondary" className="ml-2 text-xs">
            {flaggedResults.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {flaggedResults.map((item) => {
          const StatusIcon = getStatusIcon(item.status);
          return (
            <div key={item.id} className="flex items-center justify-between border-l-2 border-l-destructive pl-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <StatusIcon className="h-3 w-3 text-destructive flex-shrink-0" />
                  <span className="medical-label-xs font-medium capitalize truncate">
                    {item.testName}
                  </span>
                  <Badge variant={getStatusColor(item.severity)} className="text-xs">
                    {item.status}
                  </Badge>
                </div>
                <div className="medical-annotation text-xs">
                  <span className="font-medium">{item.value}</span>
                  {item.referenceRange && (
                    <span className="text-muted-foreground ml-2">
                      Ref: {item.referenceRange}
                    </span>
                  )}
                </div>
                <div className="medical-annotation text-xs text-muted-foreground">
                  {new Date(item.reportDate).toLocaleDateString()}
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="flex-shrink-0 ml-2"
                onClick={() => handleViewReport(item.reportId)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}