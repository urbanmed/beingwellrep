import React from 'react';
import { Download, FileText, Database, Archive, Trash2, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExport, ExportJob } from '@/hooks/useExport';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const ExportCenter: React.FC = () => {
  const {
    exportJobs,
    loading,
    startExport,
    downloadExport,
    deleteExportJob,
    retryExport,
    exportHealthSummary,
    exportAllData,
    exportRecentReports,
    getJobsByStatus,
    getTotalExportSize,
  } = useExport();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getExportIcon = (type: ExportJob['export_type']) => {
    const icons = {
      pdf_report: <FileText className="h-5 w-5" />,
      json_data: <Database className="h-5 w-5" />,
      medical_summary: <FileText className="h-5 w-5" />,
      bulk_documents: <Archive className="h-5 w-5" />,
    };
    return icons[type];
  };

  const getExportTypeLabel = (type: ExportJob['export_type']) => {
    const labels = {
      pdf_report: 'PDF Health Report',
      json_data: 'JSON Data Export',
      medical_summary: 'Medical Summary',
      bulk_documents: 'Bulk Documents',
    };
    return labels[type];
  };

  const getStatusBadgeVariant = (status: ExportJob['status']) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
    };
    return variants[status] as any;
  };

  const ExportQuickActions: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Export</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col gap-2"
            onClick={() => {
              exportHealthSummary();
              toast({
                title: "Export Started",
                description: "Generating your health summary report...",
              });
            }}
          >
            <FileText className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">Health Summary</div>
              <div className="text-xs text-muted-foreground">
                Comprehensive health overview
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col gap-2"
            onClick={() => {
              exportAllData();
              toast({
                title: "Export Started",
                description: "Exporting all your health data...",
              });
            }}
          >
            <Database className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">All Data</div>
              <div className="text-xs text-muted-foreground">
                Complete data export (JSON)
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col gap-2"
            onClick={() => {
              exportRecentReports();
              toast({
                title: "Export Started",
                description: "Exporting recent reports...",
              });
            }}
          >
            <Archive className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">Recent Reports</div>
              <div className="text-xs text-muted-foreground">
                Last 3 months
              </div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const ExportJobCard: React.FC<{ job: ExportJob }> = ({ job }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {getExportIcon(job.export_type)}
            <div>
              <div className="font-medium text-sm">
                {getExportTypeLabel(job.export_type)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(job.status)}>
              {job.status}
            </Badge>
          </div>
        </div>

        {job.status === 'processing' && (
          <div className="mb-3">
            <Progress value={job.progress_percentage} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {job.progress_percentage}% complete
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {job.file_size && (
              <span>Size: {formatFileSize(job.file_size)}</span>
            )}
            {job.expires_at && (
              <span className="ml-2">
                Expires: {formatDistanceToNow(new Date(job.expires_at), { addSuffix: true })}
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
            {job.status === 'completed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadExport(job)}
                className="h-7"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            )}
            
            {job.status === 'failed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => retryExport(job)}
                className="h-7"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteExportJob(job.id)}
              className="h-7 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {job.error_message && (
          <div className="mt-3 p-2 bg-destructive/10 rounded text-destructive text-xs">
            {job.error_message}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading export jobs...</p>
        </CardContent>
      </Card>
    );
  }

  const activeJobs = getJobsByStatus('processing');
  const completedJobs = getJobsByStatus('completed');
  const failedJobs = getJobsByStatus('failed');

  return (
    <div className="space-y-6">
      <ExportQuickActions />

      {/* Export Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{exportJobs.length}</div>
            <div className="text-xs text-muted-foreground">Total Exports</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{activeJobs.length}</div>
            <div className="text-xs text-muted-foreground">Processing</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{completedJobs.length}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold">{formatFileSize(getTotalExportSize())}</div>
            <div className="text-xs text-muted-foreground">Total Size</div>
          </CardContent>
        </Card>
      </div>

      {/* Export Jobs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({exportJobs.length})</TabsTrigger>
          <TabsTrigger value="processing">Processing ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failedJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {exportJobs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No exports yet</p>
                <p className="text-sm">Use the quick export options above to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {exportJobs.map((job) => (
                <ExportJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeJobs.map((job) => (
              <ExportJobCard key={job.id} job={job} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedJobs.map((job) => (
              <ExportJobCard key={job.id} job={job} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {failedJobs.map((job) => (
              <ExportJobCard key={job.id} job={job} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExportCenter;