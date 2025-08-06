import { useMemo } from "react";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { AlertTriangle, TrendingDown, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Report {
  id: string;
  title: string;
  report_type: string;
  parsing_status: string;
  physician_name: string | null;
  facility_name: string | null;
  report_date: string;
  created_at: string;
  is_critical: boolean;
  file_size: number | null;
  file_name: string;
}

interface SmartAlertsProps {
  reports: Report[];
  onNavigateToUpload: () => void;
}

interface AlertItem {
  id: string;
  type: 'missing' | 'overdue' | 'trend';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  actionHandler?: () => void;
}

export function SmartAlerts({ reports, onNavigateToUpload }: SmartAlertsProps) {
  const alerts = useMemo(() => {
    const alertItems: AlertItem[] = [];
    const now = new Date();

    // Check for missing routine reports
    const lastSixMonths = reports.filter(r => 
      isWithinInterval(new Date(r.report_date), { 
        start: startOfDay(subDays(now, 180)), 
        end: endOfDay(now) 
      })
    );

    const lastYear = reports.filter(r => 
      isWithinInterval(new Date(r.report_date), { 
        start: startOfDay(subDays(now, 365)), 
        end: endOfDay(now) 
      })
    );

    // Missing blood tests (should be annual)
    const recentBloodTests = lastYear.filter(r => r.report_type === 'blood_test');
    if (recentBloodTests.length === 0) {
      alertItems.push({
        id: 'missing-blood-test',
        type: 'missing',
        severity: 'high',
        title: 'Missing Annual Blood Test',
        description: 'No blood test results found in the past year. Consider scheduling a routine checkup.',
        action: 'Schedule Test',
        actionHandler: onNavigateToUpload
      });
    }

    // Missing prescription updates (check last 6 months)
    const recentPrescriptions = lastSixMonths.filter(r => r.report_type === 'prescription');
    if (recentPrescriptions.length === 0 && reports.filter(r => r.report_type === 'prescription').length > 0) {
      alertItems.push({
        id: 'missing-prescription',
        type: 'missing',
        severity: 'medium',
        title: 'No Recent Prescription Updates',
        description: 'No prescription records in the past 6 months. Consider uploading recent prescriptions.',
        action: 'Upload Prescription',
        actionHandler: onNavigateToUpload
      });
    }

    // Check for declining health trends
    const lastThreeMonths = reports.filter(r => 
      isWithinInterval(new Date(r.report_date), { 
        start: startOfDay(subDays(now, 90)), 
        end: endOfDay(now) 
      })
    );

    const criticalReportsRecent = lastThreeMonths.filter(r => r.is_critical).length;
    const criticalReportsPrevious = reports.filter(r => {
      const reportDate = new Date(r.report_date);
      return isWithinInterval(reportDate, { 
        start: startOfDay(subDays(now, 180)), 
        end: startOfDay(subDays(now, 90))
      }) && r.is_critical;
    }).length;

    if (criticalReportsRecent > criticalReportsPrevious && criticalReportsRecent > 0) {
      alertItems.push({
        id: 'increasing-critical',
        type: 'trend',
        severity: 'high',
        title: 'Increasing Critical Reports',
        description: `${criticalReportsRecent} critical reports in the last 3 months vs ${criticalReportsPrevious} in the previous period.`,
      });
    }

    // Check for overdue follow-ups
    const dischargeReports = reports.filter(r => r.report_type === 'discharge');
    dischargeReports.forEach(discharge => {
      const dischargeDate = new Date(discharge.report_date);
      const daysSinceDischarge = (now.getTime() - dischargeDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceDischarge > 14 && daysSinceDischarge < 90) {
        const followUpReports = reports.filter(r => {
          const reportDate = new Date(r.report_date);
          return reportDate > dischargeDate && 
                 r.physician_name === discharge.physician_name &&
                 r.report_type !== 'discharge';
        });

        if (followUpReports.length === 0) {
          alertItems.push({
            id: `overdue-followup-${discharge.id}`,
            type: 'overdue',
            severity: 'medium',
            title: 'Potential Missing Follow-up',
            description: `Discharge from ${discharge.facility_name || 'hospital'} on ${format(dischargeDate, 'MMM d')} may need follow-up.`,
            action: 'Schedule Follow-up',
            actionHandler: onNavigateToUpload
          });
        }
      }
    });

    // Check for processing failures
    const failedReports = reports.filter(r => r.parsing_status === 'failed');
    if (failedReports.length > 0) {
      alertItems.push({
        id: 'processing-failures',
        type: 'overdue',
        severity: 'low',
        title: 'Documents Need Attention',
        description: `${failedReports.length} document${failedReports.length > 1 ? 's' : ''} failed to process and may need re-uploading.`,
      });
    }

    return alertItems.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [reports, onNavigateToUpload]);

  if (alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'missing':
        return <Calendar className="h-4 w-4" />;
      case 'overdue':
        return <Clock className="h-4 w-4" />;
      case 'trend':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <span>Health Insights & Alerts</span>
          <Badge variant="outline" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <Alert key={alert.id} variant={getAlertVariant(alert.severity) as any}>
            <div className="flex items-start space-x-3">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <h4 className="font-medium text-sm">{alert.title}</h4>
                <AlertDescription className="text-xs mt-1">
                  {alert.description}
                </AlertDescription>
                {alert.action && alert.actionHandler && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-6 text-xs"
                    onClick={alert.actionHandler}
                  >
                    {alert.action}
                  </Button>
                )}
              </div>
              <Badge variant={getAlertVariant(alert.severity) as any} className="text-xs">
                {alert.severity}
              </Badge>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}