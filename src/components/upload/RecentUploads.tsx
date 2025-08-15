import { useEffect, useState } from 'react';
import { FileText, Calendar, User, AlertCircle, CheckCircle, Clock, Brain, Sparkles, Trash2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { GenerateSummaryDialogWrapper } from '@/components/summaries/GenerateSummaryDialogWrapper';
import { DeleteConfirmDialog } from '@/components/reports/DeleteConfirmDialog';
import { useReports } from '@/hooks/useReports';

interface Report {
  id: string;
  title: string;
  report_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
  parsing_status: string;
  extraction_confidence: number | null;
  processing_error: string | null;
  physician_name: string | null;
}

export function RecentUploads() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const { deleteMultipleReports, retryProcessing: retryReportProcessing } = useReports();

  useEffect(() => {
    fetchRecentReports();
  }, []);

  const fetchRecentReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recent uploads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const retryProcessing = async (reportId: string) => {
    await retryReportProcessing(reportId);
    fetchRecentReports();
  };

  const handleSelectReport = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedForDeletion(prev => [...prev, reportId]);
    } else {
      setSelectedForDeletion(prev => prev.filter(id => id !== reportId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedForDeletion(reports.map(r => r.id));
    } else {
      setSelectedForDeletion([]);
    }
  };

  const handleBulkDelete = async () => {
    setShowDeleteDialog(false);
    await deleteMultipleReports(selectedForDeletion);
    setSelectedForDeletion([]);
    fetchRecentReports();
  };

  const clearFailedReports = async () => {
    const failedReportIds = reports
      .filter(r => r.parsing_status === 'failed')
      .map(r => r.id);
    
    if (failedReportIds.length > 0) {
      await deleteMultipleReports(failedReportIds);
      fetchRecentReports();
    }
  };

  const retryAllFailed = async () => {
    const failedReports = reports.filter(r => r.parsing_status === 'failed');
    for (const report of failedReports) {
      await retryReportProcessing(report.id);
    }
    fetchRecentReports();
  };

  const getProcessingStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getProcessingStatusBadge = (status: string, confidence: number | null) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            Processing Complete {confidence && `(${Math.round(confidence * 100)}%)`}
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Processing Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending Processing</Badge>;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card className="medical-card-shadow">
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 medical-label">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="medical-card-shadow">
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="medical-label text-center py-8">
            No uploads yet. Start by uploading your first document above.
          </p>
        </CardContent>
      </Card>
    );
  }

  const failedCount = reports.filter(r => r.parsing_status === 'failed').length;
  const processingCount = reports.filter(r => r.parsing_status === 'processing').length;

  return (
    <Card className="medical-card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Recent Uploads</CardTitle>
          {reports.length > 0 && (
            <div className="flex items-center gap-2">
              {failedCount > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryAllFailed}
                    className="text-blue-600 hover:text-blue-700 rounded-full shadow-none min-h-[36px] touch-target"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry All Failed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFailedReports}
                    className="text-destructive hover:text-destructive rounded-full shadow-none min-h-[36px] touch-target"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear Failed
                  </Button>
                </>
              )}
              {selectedForDeletion.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="rounded-full shadow-none min-h-[36px] touch-target"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete Selected ({selectedForDeletion.length})
                </Button>
              )}
            </div>
          )}
        </div>
        {reports.length > 0 && (
          <div className="flex items-center gap-4 medical-label">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedForDeletion.length === reports.length && reports.length > 0}
                onCheckedChange={handleSelectAll}
              />
              Select All
            </label>
            <span>{reports.length} total</span>
            {processingCount > 0 && <span>{processingCount} processing</span>}
            {failedCount > 0 && <span className="text-red-600">{failedCount} failed</span>}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {reports.map((report) => (
          <div key={report.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={selectedForDeletion.includes(report.id)}
                  onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                />
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{report.title}</h3>
                  <p className="text-xs text-muted-foreground">{report.file_name}</p>
                </div>
              </div>
              {getProcessingStatusBadge(report.parsing_status, report.extraction_confidence)}
            </div>

            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(report.created_at), 'MMM d, yyyy')}</span>
              </div>
              
              <span>{formatFileSize(report.file_size || 0)}</span>
              
              {report.physician_name && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{report.physician_name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getProcessingStatusIcon(report.parsing_status)}
                <span className="text-xs text-muted-foreground capitalize">
                  {report.report_type.replace('_', ' ')}
                </span>
              </div>

            <div className="flex items-center space-x-2">
              {report.parsing_status === 'failed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => retryProcessing(report.id)}
                  className="rounded-full shadow-none h-8"
                >
                  Retry Processing
                </Button>
              )}
              
              {report.parsing_status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedReportIds([report.id]);
                    setShowGenerateDialog(true);
                  }}
                  className="text-primary hover:text-primary rounded-full shadow-none h-8"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate Summary
                </Button>
              )}
            </div>
            </div>

            {report.processing_error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
                <p className="text-xs text-red-600 dark:text-red-400">
                  {report.processing_error}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
      
      <GenerateSummaryDialogWrapper
        isOpen={showGenerateDialog}
        onClose={() => {
          setShowGenerateDialog(false);
          setSelectedReportIds([]);
        }}
        preSelectedReportIds={selectedReportIds}
      />
      
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        isMultiple={true}
        count={selectedForDeletion.length}
      />
    </Card>
  );
}