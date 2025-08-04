import { useEffect, useState } from 'react';
import { FileText, Calendar, User, AlertCircle, CheckCircle, Clock, Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { GenerateSummaryDialogWrapper } from '@/components/summaries/GenerateSummaryDialogWrapper';

interface Report {
  id: string;
  title: string;
  report_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
  ocr_status: string;
  ocr_confidence: number | null;
  processing_error: string | null;
  physician_name: string | null;
}

export function RecentUploads() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const { toast } = useToast();

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

  const retryOCR = async (reportId: string) => {
    try {
      const { error } = await supabase.functions.invoke('process-ocr', {
        body: { reportId }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: 'OCR processing restarted',
      });

      // Refresh the list
      fetchRecentReports();
    } catch (error) {
      console.error('Error retrying OCR:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry OCR processing',
        variant: 'destructive',
      });
    }
  };

  const getOCRStatusIcon = (status: string) => {
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

  const getOCRStatusBadge = (status: string, confidence: number | null) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            OCR Complete {confidence && `(${Math.round(confidence * 100)}%)`}
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">OCR Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending OCR</Badge>;
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
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No uploads yet. Start by uploading your first document above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reports.map((report) => (
          <div key={report.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">{report.title}</h3>
                  <p className="text-sm text-muted-foreground">{report.file_name}</p>
                </div>
              </div>
              {getOCRStatusBadge(report.ocr_status, report.ocr_confidence)}
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
                {getOCRStatusIcon(report.ocr_status)}
                <span className="text-sm capitalize">
                  {report.report_type.replace('_', ' ')}
                </span>
              </div>

            <div className="flex items-center space-x-2">
              {report.ocr_status === 'failed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => retryOCR(report.id)}
                >
                  Retry OCR
                </Button>
              )}
              
              {report.ocr_status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedReportIds([report.id]);
                    setShowGenerateDialog(true);
                  }}
                  className="text-primary hover:text-primary"
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
    </Card>
  );
}