import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  BarChart3,
  FileText
} from 'lucide-react';
import { useFHIRHealthCheck } from '@/hooks/useFHIRHealthCheck';

export const FHIRIntegrationPanel = () => {
  const { runHealthCheck, runBackfill, loading, backfillLoading } = useFHIRHealthCheck();
  const [healthReport, setHealthReport] = useState<any>(null);
  const [backfillResult, setBackfillResult] = useState<any>(null);

  const handleHealthCheck = async () => {
    const result = await runHealthCheck(7);
    if (result) {
      setHealthReport(result);
    }
  };

  const handleBackfill = async () => {
    const result = await runBackfill(50);
    if (result) {
      setBackfillResult(result);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            FHIR Integration Status
          </CardTitle>
          <CardDescription>
            Monitor and manage FHIR resource creation for medical documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={handleHealthCheck} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Run Health Check
            </Button>
            <Button 
              onClick={handleBackfill}
              disabled={backfillLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {backfillLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Run FHIR Backfill
            </Button>
          </div>

          {healthReport && (
            <div className="space-y-4">
              <Separator />
              
              {/* Health Status */}
              <div className="flex items-center gap-3">
                {getStatusIcon(healthReport.healthStatus)}
                <span className="font-medium">System Status:</span>
                <Badge className={getStatusColor(healthReport.healthStatus)}>
                  {healthReport.healthStatus.toUpperCase()}
                </Badge>
              </div>

              {/* Coverage Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {healthReport.reportStatistics.fhirCoverageRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">FHIR Coverage</div>
                    <Progress value={healthReport.reportStatistics.fhirCoverageRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {healthReport.reportStatistics.completed}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed Reports</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {healthReport.reportStatistics.completedWithoutFHIR}
                    </div>
                    <div className="text-sm text-muted-foreground">Missing FHIR</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {healthReport.fhirResourceCounts.observations + 
                       healthReport.fhirResourceCounts.medicationRequests + 
                       healthReport.fhirResourceCounts.diagnosticReports}
                    </div>
                    <div className="text-sm text-muted-foreground">Total FHIR Resources</div>
                  </CardContent>
                </Card>
              </div>

              {/* FHIR Resources Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-4 w-4" />
                    FHIR Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-semibold">{healthReport.fhirResourceCounts.patients}</div>
                      <div className="text-sm text-muted-foreground">Patients</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold">{healthReport.fhirResourceCounts.observations}</div>
                      <div className="text-sm text-muted-foreground">Observations</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold">{healthReport.fhirResourceCounts.medicationRequests}</div>
                      <div className="text-sm text-muted-foreground">Medications</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold">{healthReport.fhirResourceCounts.diagnosticReports}</div>
                      <div className="text-sm text-muted-foreground">Diagnostic Reports</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Issues */}
              {healthReport.issues.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Issues Found:</h3>
                  {healthReport.issues.map((issue, index) => (
                    <Alert key={index} variant={issue.severity === 'error' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{issue.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {healthReport.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {healthReport.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'outline'}>
                            {rec.priority}
                          </Badge>
                          <div>
                            <div className="font-medium">{rec.action}</div>
                            <div className="text-sm text-muted-foreground">{rec.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Problematic Reports */}
              {healthReport.problematicReports.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-4 w-4" />
                      Reports Needing Attention ({healthReport.problematicReports.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {healthReport.problematicReports.slice(0, 5).map((report) => (
                        <div key={report.id} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <div className="font-medium text-sm">{report.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {report.report_type} • {new Date(report.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge variant="outline">{report.id.slice(-8)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {backfillResult && (
            <div className="space-y-4">
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Backfill Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-semibold text-blue-600">{backfillResult.totalReportsChecked}</div>
                      <div className="text-sm text-muted-foreground">Reports Checked</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-orange-600">{backfillResult.reportsNeedingBackfill}</div>
                      <div className="text-sm text-muted-foreground">Needed Backfill</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-green-600">{backfillResult.successCount}</div>
                      <div className="text-sm text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-red-600">{backfillResult.errorCount}</div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>{backfillResult.message}</AlertDescription>
                    </Alert>
                  </div>

                  {backfillResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Errors:</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {backfillResult.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};