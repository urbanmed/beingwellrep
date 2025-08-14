import { useState } from "react";
import { FileSearch, AlertTriangle, CheckCircle, RefreshCw, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useFileConsistencyChecker } from "@/hooks/useFileConsistencyChecker";

export function FileConsistencyPanel() {
  const [lastReport, setLastReport] = useState<any>(null);
  const { 
    checkFileConsistency, 
    markReportForReupload, 
    generateConsistencyReport,
    isChecking, 
    isFixing 
  } = useFileConsistencyChecker();

  const handleRunCheck = async () => {
    try {
      const report = await checkFileConsistency();
      setLastReport(report);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleFixReport = async (reportId: string) => {
    try {
      await markReportForReupload(reportId);
      // Refresh the consistency check
      handleRunCheck();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const downloadReport = () => {
    if (!lastReport) return;
    
    const reportText = generateConsistencyReport(lastReport);
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `file-consistency-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'missing_file': return 'File Missing';
      case 'corrupted_file': return 'File Corrupted';
      case 'invalid_path': return 'Invalid Path';
      case 'access_denied': return 'Access Denied';
      default: return 'Unknown Issue';
    }
  };

  const getIssueVariant = (type: string) => {
    switch (type) {
      case 'missing_file': return 'destructive';
      case 'corrupted_file': return 'destructive';
      case 'invalid_path': return 'secondary';
      case 'access_denied': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          File Consistency Check
        </CardTitle>
        <CardDescription>
          Verify that all your uploaded documents are properly stored and accessible
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={handleRunCheck}
            disabled={isChecking}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking Files...' : 'Run Consistency Check'}
          </Button>
          
          {lastReport && (
            <Button 
              variant="outline" 
              onClick={downloadReport}
              disabled={isChecking}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>

        {lastReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{lastReport.totalReports}</div>
                <div className="text-sm text-muted-foreground">Total Reports</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{lastReport.validFiles}</div>
                <div className="text-sm text-muted-foreground">Valid Files</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{lastReport.issuesFound.length}</div>
                <div className="text-sm text-muted-foreground">Issues Found</div>
              </div>
            </div>

            {lastReport.issuesFound.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All files are properly stored and accessible. No issues found!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {lastReport.issuesFound.length} file consistency issue(s) that need attention.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium">Issues Found:</h4>
                  {lastReport.issuesFound.map((issue: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium truncate">{issue.title}</h5>
                          <Badge variant={getIssueVariant(issue.issueType)}>
                            {getIssueTypeLabel(issue.issueType)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {issue.fileName}
                        </p>
                      </div>
                      
                      {issue.canReupload && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFixReport(issue.reportId)}
                          disabled={isFixing}
                        >
                          {isFixing ? 'Fixing...' : 'Mark for Re-upload'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Last checked: {lastReport.checkedAt.toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}