import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFileConsistency } from "@/hooks/useFileConsistency";
import { AlertTriangle, CheckCircle, FileX, Loader2, RefreshCw } from "lucide-react";

interface ConsistencyResult {
  reportId: string;
  title: string;
  fileUrl: string;
  fileExists: boolean;
  error?: string;
}

export function FileConsistencyMonitor() {
  const { checkConsistency, isChecking } = useFileConsistency();
  const [results, setResults] = useState<ConsistencyResult[] | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const handleCheckConsistency = async () => {
    try {
      const consistencyResults = await checkConsistency();
      setResults(consistencyResults);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Failed to check consistency:', error);
    }
  };

  const missingFiles = results?.filter(r => !r.fileExists) || [];
  const validFiles = results?.filter(r => r.fileExists) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileX className="h-5 w-5" />
              File Consistency Monitor
            </CardTitle>
            <CardDescription>
              Verify that all medical documents in the database have corresponding files in storage
            </CardDescription>
          </div>
          <Button 
            onClick={handleCheckConsistency} 
            disabled={isChecking}
            variant="outline"
            size="sm"
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isChecking ? 'Checking...' : 'Check Consistency'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {lastCheck && (
          <div className="text-sm text-muted-foreground">
            Last checked: {lastCheck.toLocaleString()}
          </div>
        )}

        {results && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{results.length}</div>
              <div className="text-sm text-muted-foreground">Total Reports</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{validFiles.length}</div>
              <div className="text-sm text-muted-foreground">Valid Files</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{missingFiles.length}</div>
              <div className="text-sm text-muted-foreground">Missing Files</div>
            </div>
          </div>
        )}

        {missingFiles.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {missingFiles.length} documents have missing files. These reports may show errors to users.
            </AlertDescription>
          </Alert>
        )}

        {results && missingFiles.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All medical documents have valid files in storage.
            </AlertDescription>
          </Alert>
        )}

        {missingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Missing Files:</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {missingFiles.map((result) => (
                <div key={result.reportId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{result.fileUrl}</div>
                    {result.error && (
                      <div className="text-xs text-red-600 mt-1">{result.error}</div>
                    )}
                  </div>
                  <Badge variant="destructive">Missing</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {!results && !isChecking && (
          <div className="text-center py-8 text-muted-foreground">
            Click "Check Consistency" to scan for file consistency issues
          </div>
        )}
      </CardContent>
    </Card>
  );
}