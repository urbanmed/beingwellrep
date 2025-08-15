import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, User, FolderOpen, CheckCircle, AlertCircle, Clock, Eye, Download } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useFileDownload } from "@/hooks/useFileDownload";

const REPORT_TYPE_CONFIG = {
  blood_test: { 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: '🩸',
    priority: 'high'
  },
  prescription: { 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: '💊',
    priority: 'high'
  },
  radiology: { 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: '🔍',
    priority: 'medium'
  },
  insurance: { 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    icon: '📋',
    priority: 'medium'
  },
  discharge: { 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    icon: '🏥',
    priority: 'high'
  },
  general: { 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    icon: '📄',
    priority: 'low'
  }
};

export function RecentReportsVault() {
  const { reports } = useReports();
  const { downloadFile, isDownloading } = useFileDownload();
  const navigate = useNavigate();

  const recentReports = reports
    .filter(r => r.parsing_status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string, confidence: number | null) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            Ready {confidence && `(${Math.round(confidence * 100)}%)`}
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center justify-between">
          <div className="flex items-center">
            <FolderOpen className="h-4 w-4 mr-2 text-primary" />
            Recent Reports
          </div>
          <Badge variant="outline" className="text-xs">
            {reports.length} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 sm:space-y-3">
        {recentReports.length === 0 ? (
          <div className="text-center py-3 sm:py-4">
            <p className="text-xs sm:text-sm text-muted-foreground mb-3">No reports uploaded yet</p>
            <Button size="sm" onClick={() => navigate('/upload')} className="min-h-[44px] touch-target">
              Upload First Report
            </Button>
          </div>
        ) : (
          <>
            {recentReports.map((report) => {
              const config = REPORT_TYPE_CONFIG[report.report_type as keyof typeof REPORT_TYPE_CONFIG] || REPORT_TYPE_CONFIG.general;
              
              return (
                <Card 
                  key={report.id}
                  className="group cursor-pointer hover:shadow-sm"
                  onClick={() => navigate(`/vault/${report.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${config.color}`}>
                          <span className="text-base">{config.icon}</span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium truncate">{report.title || 'Untitled Report'}</h3>
                          {report.is_critical && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Critical</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{report.report_type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{format(new Date(report.report_date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {getStatusIcon(report.parsing_status)}
                          {getStatusBadge(report.parsing_status, report.extraction_confidence)}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/vault/${report.id}`);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {report.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(report.id, report.file_name, report.file_url);
                            }}
                            disabled={isDownloading(report.id)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full min-h-[44px] touch-target" 
              onClick={() => navigate('/vault')}
            >
              View All Reports
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}