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
        
        // Check lab results
        if (data?.tests) {
          data.tests.forEach((test: any) => {
            if (test.status && ['critical', 'high', 'low', 'abnormal'].includes(test.status.toLowerCase())) {
              const severity = test.status.toLowerCase() === 'critical' ? 'critical' : 
                              ['high', 'low'].includes(test.status.toLowerCase()) ? 'warning' : 'info';
              
              flagged.push({
                id: `${report.id}-${test.name}`,
                testName: test.name,
                value: test.value + (test.unit ? ` ${test.unit}` : ''),
                status: test.status.toLowerCase(),
                referenceRange: test.referenceRange,
                reportId: report.id,
                reportTitle: report.title || 'Medical Report',
                reportDate: report.report_date,
                severity
              });
            }
          });
        }
        
        // Check vitals
        if (data?.vitals) {
          data.vitals.forEach((vital: any) => {
            if (vital.status && ['critical', 'high', 'low', 'abnormal'].includes(vital.status.toLowerCase())) {
              const severity = vital.status.toLowerCase() === 'critical' ? 'critical' : 'warning';
              
              flagged.push({
                id: `${report.id}-${vital.type}`,
                testName: vital.type.replace(/_/g, ' '),
                value: vital.value + (vital.unit ? ` ${vital.unit}` : ''),
                status: vital.status.toLowerCase(),
                reportId: report.id,
                reportTitle: report.title || 'Medical Report',
                reportDate: report.report_date,
                severity
              });
            }
          });
        }
      } catch (error) {
        console.warn('Error parsing action items from report:', error);
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