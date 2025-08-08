import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useSummaries } from "@/hooks/useSummaries";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { extractActionItemsFromSummary } from "@/lib/utils/summary-to-dashboard";
import { format, isToday, isYesterday } from "date-fns";

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

// Helper functions (hoisted to avoid TDZ issues)
function normalizeTestStatus(status: string | undefined): 'critical' | 'high' | 'low' | 'abnormal' | null {
  if (!status) return null;
  const normalized = status.toLowerCase().trim();
  if (normalized.includes('critical') || normalized.includes('severe')) return 'critical';
  if (normalized.includes('high') || normalized.includes('elevated')) return 'high';
  if (normalized.includes('low') || normalized.includes('decreased')) return 'low';
  if (normalized.includes('abnormal')) return 'abnormal';
  if (normalized.includes('normal')) return null; // exclude normal
  return null;
}

function determineSeverityLevel(status: string): 'critical' | 'warning' | 'info' {
  switch (status.toLowerCase()) {
    case 'critical':
      return 'critical';
    case 'high':
    case 'low':
      return 'warning';
    default:
      return 'info';
  }
}

// Infer status from numeric value and reference range like "3.5 - 5.1"
function inferStatusFromValue(value: string | number | undefined, referenceRange?: string): 'critical' | 'high' | 'low' | 'abnormal' | 'normal' | null {
  if (value == null || referenceRange == null) return null;
  const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return null;

  const range = String(referenceRange).toLowerCase().trim();
  if (!range.includes('-')) return null;
  const parts = range.split('-').map(p => parseFloat(p.trim().replace(/[^\d.-]/g, '')));
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  const [low, high] = parts as [number, number];

  if (num < low * 0.5 || num > high * 2) return 'critical';
  if (num < low) return 'low';
  if (num > high) return 'high';
  return 'normal';
}

// Infer vital status from common thresholds
function inferVitalStatus(type: string | undefined, value: string | number | undefined, unit?: string): 'critical' | 'high' | 'low' | 'abnormal' | 'normal' | null {
  if (!type || value == null) return null;
  const t = type.toLowerCase();
  const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return null;

  switch (t) {
    case 'heart_rate':
    case 'pulse':
      if (num < 40 || num > 140) return 'critical';
      if (num < 60 || num > 100) return 'high';
      return 'normal';
    case 'blood_pressure':
    case 'systolic':
      if (num > 180 || num < 70) return 'critical';
      if (num > 140 || num < 90) return 'high';
      return 'normal';
    case 'temperature':
      if (unit?.toLowerCase().includes('f')) {
        if (num > 104 || num < 95) return 'critical';
        if (num > 100.4 || num < 97) return 'high';
      } else {
        if (num > 40 || num < 35) return 'critical';
        if (num > 38 || num < 36) return 'high';
      }
      return 'normal';
    default:
      return null;
  }
}

function parseAbnormalFromText(text: string, report: any): FlaggedResult[] {
  const results: FlaggedResult[] = [];
  const abnormalPatterns = [
    /([A-Za-z\s]+)\s*:\s*([0-9.]+)\s*([A-Za-z/%]*)\s*(?:\(([^)]*)\))?.*(high|low|elevated|decreased|abnormal|critical)/gi,
    /(high|low|elevated|decreased|abnormal|critical).+?([A-Za-z\s]+)\s*:\s*([0-9.]+)/gi,
  ];
  for (const pattern of abnormalPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      try {
        const isSecondPattern =
          match[1] && ['high', 'low', 'elevated', 'decreased', 'abnormal', 'critical'].includes(match[1].toLowerCase());
        const testName = (isSecondPattern ? match[2] : match[1])?.trim();
        const value = isSecondPattern ? match[3] : match[2];
        const unit = isSecondPattern ? '' : match[3] || '';
        const statusRaw = (isSecondPattern ? match[1] : match[5])?.toLowerCase();
        if (testName && value && statusRaw) {
          const normalizedStatus = normalizeTestStatus(statusRaw);
          if (normalizedStatus) {
            results.push({
              id: `${report.id}-${testName}-${Date.now()}`,
              testName,
              value: value + (unit ? ` ${unit}` : ''),
              status: normalizedStatus as any,
              reportId: report.id,
              reportTitle: report.title || 'Medical Report',
              reportDate: report.report_date,
              severity: determineSeverityLevel(normalizedStatus),
            });
          }
        }
      } catch (parseError) {
        console.warn('Error parsing abnormal result from text:', parseError);
      }
    }
  }
  return results;
}

export function ActionItems() {
  const { reports } = useReports();
  const { summaries } = useSummaries();
  const navigate = useNavigate();

  const aiBasedResults = useMemo<FlaggedResult[]>(() => {
    try {
      if (!summaries || summaries.length === 0) return [] as FlaggedResult[];
      const latest = [...summaries].sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0];
      if (!latest) return [] as FlaggedResult[];
      const extracted = extractActionItemsFromSummary(latest.content) || [];
      return extracted.map((i) => ({
        id: i.id,
        testName: i.testName,
        value: i.value,
        status: i.status,
        severity: i.severity,
        reportId: '',
        reportTitle: 'AI Summary',
        reportDate: latest.generated_at,
      }));
    } catch (e) {
      console.warn('AI action items extraction failed:', e);
      return [] as FlaggedResult[];
    }
  }, [summaries]);

  const flaggedResults = useMemo<FlaggedResult[]>(() => {
    if (aiBasedResults.length > 0) {
      return aiBasedResults.slice(0, 5);
    }

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
            const refRange = test.referenceRange || test.reference_range || test.refRange;
            const inferred = inferStatusFromValue(test.value, refRange);
            const normalized = normalizeTestStatus(test.status) || (inferred && inferred !== 'normal' ? (inferred as any) : null);
            if (normalized && ['critical', 'high', 'low', 'abnormal'].includes(normalized)) {
              const severity = determineSeverityLevel(normalized);
              
              flagged.push({
                id: `${report.id}-${test.name}`,
                testName: test.name,
                value: test.value + (test.unit ? ` ${test.unit}` : ''),
                status: normalized as any,
                referenceRange: refRange,
                reportId: report.id,
                reportTitle: report.title || 'Medical Report',
                reportDate: report.report_date,
                severity
              });
            }
          });
        }
        
        // Check vitals with enhanced parsing and inference
        if (data?.vitals) {
          data.vitals.forEach((vital: any) => {
            const inferred = inferVitalStatus(vital.type, vital.value, vital.unit);
            const normalized = normalizeTestStatus(vital.status) || (inferred && inferred !== 'normal' ? (inferred as any) : null);
            if (normalized && ['critical', 'high', 'low', 'abnormal'].includes(normalized)) {
              const severity = determineSeverityLevel(normalized);
              
              flagged.push({
                id: `${report.id}-${vital.type}`,
                testName: vital.type.replace(/_/g, ' '),
                value: vital.value + (vital.unit ? ` ${vital.unit}` : ''),
                status: normalized as any,
                reportId: report.id,
                reportTitle: report.title || 'Medical Report',
                reportDate: report.report_date,
                severity
              });
            }
          });
        }

        // Support alternative shapes under extractedData
        if (data?.extractedData?.labTestResults && Array.isArray(data.extractedData.labTestResults)) {
          data.extractedData.labTestResults.forEach((test: any) => {
            const refRange = test.referenceRange || test.reference_range || test.refRange;
            const inferred = inferStatusFromValue(test.value, refRange);
            const normalized = normalizeTestStatus(test.status) || (inferred && inferred !== 'normal' ? (inferred as any) : null);
            if (normalized && ['critical', 'high', 'low', 'abnormal'].includes(normalized)) {
              const severity = determineSeverityLevel(normalized);
              flagged.push({
                id: `${report.id}-${test.name}`,
                testName: test.name,
                value: test.value + (test.unit ? ` ${test.unit}` : ''),
                status: normalized as any,
                referenceRange: refRange,
                reportId: report.id,
                reportTitle: report.title || 'Medical Report',
                reportDate: report.report_date,
                severity
              });
            }
          });
        }

        if (data?.extractedData?.vitals && Array.isArray(data.extractedData.vitals)) {
          data.extractedData.vitals.forEach((vital: any) => {
            const inferred = inferVitalStatus(vital.type, vital.value, vital.unit);
            const normalized = normalizeTestStatus(vital.status) || (inferred && inferred !== 'normal' ? (inferred as any) : null);
            if (normalized && ['critical', 'high', 'low', 'abnormal'].includes(normalized)) {
              const severity = determineSeverityLevel(normalized);
              flagged.push({
                id: `${report.id}-${vital.type}`,
                testName: vital.type.replace(/_/g, ' '),
                value: vital.value + (vital.unit ? ` ${vital.unit}` : ''),
                status: normalized as any,
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
        const severityOrder = { critical: 0, warning: 1, info: 2 } as const;
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
      })
      .slice(0, 5); // Show top 5 most important
  }, [reports, aiBasedResults]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, FlaggedResult[]> = {};
    const order: string[] = [];
    for (const item of flaggedResults) {
      const d = new Date(item.reportDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(item);
    }
    return order.map((key) => {
      const anyItem = groups[key][0];
      const date = new Date(anyItem.reportDate);
      let label = format(date, "PPP");
      if (isToday(date)) label = "Today";
      else if (isYesterday(date)) label = "Yesterday";
      return { dateKey: key, dateLabel: label, items: groups[key] } as const;
    });
  }, [flaggedResults]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return AlertTriangle;
      case 'high': return TrendingUp;
      case 'low': return TrendingDown;
      default: return AlertCircle;
    }
  };


  const handleViewSummary = (reportId?: string) => {
    const comprehensive = summaries.filter((s) => s.summary_type === 'comprehensive');
    let target = null as (typeof comprehensive)[number] | null;

    if (reportId) {
      target = comprehensive.find((s) => Array.isArray(s.source_report_ids) && s.source_report_ids.includes(reportId)) || null;
    }

    if (!target && comprehensive.length > 0) {
      target = [...comprehensive].sort(
        (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
      )[0];
    }

    if (target) {
      navigate(`/summaries?id=${target.id}`);
    } else {
      navigate('/summaries');
    }
  };

  if (flaggedResults.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="medical-heading-sm flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-primary" />
            Latest Health Results
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
          Latest Health Results
          <Badge variant="secondary" className="ml-2 text-xs">
            {flaggedResults.length}
          </Badge>
          {aiBasedResults.length > 0 && (
            <Badge variant="outline" className="ml-2 text-xs">From AI summary</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {groupedResults.map((group) => (
          <div key={group.dateKey} className="space-y-1">
            <div className="medical-annotation text-xs text-muted-foreground">
              {group.dateLabel}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const StatusIcon = getStatusIcon(item.status);
                return (
                  <div key={item.id} className="flex items-center justify-between border-l border-l-destructive pl-2 py-0.5">
                    <div className="flex items-center min-w-0 gap-1">
                      <StatusIcon className="h-3 w-3 text-destructive flex-shrink-0" />
                      <span className="medical-label-xs font-medium capitalize truncate">
                        {item.testName}
                      </span>
                      <span className="medical-annotation text-xs truncate">
                        <span className="font-medium ml-1">{item.value}</span>
                        {item.referenceRange && (
                          <span className="text-muted-foreground ml-2">Ref: {item.referenceRange}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-0.5 h-7 w-7"
                        onClick={() => handleViewSummary(item.reportId)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}