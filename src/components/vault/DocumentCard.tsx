import { format } from "date-fns";
import { Calendar, Download, Eye, AlertCircle, CheckCircle, Clock, Link, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFileDownload } from "@/hooks/useFileDownload";
import { ReportActions } from "@/components/reports/ReportActions";

interface Report {
  id: string;
  title: string;
  report_type: string;
  parsing_status: string;
  parsed_data: any;
  extraction_confidence: number | null;
  parsing_confidence: number | null;
  extracted_text: string | null;
  file_url: string | null;
  physician_name: string | null;
  facility_name: string | null;
  report_date: string;
  created_at: string;
  is_critical: boolean;
  file_size: number | null;
  file_name: string;
  tags: string[];
  description?: string;
  processing_error?: string;
}

interface DocumentCardProps {
  report: Report;
  isSelected: boolean;
  onSelect: (reportId: string, checked: boolean) => void;
  onNavigate: (reportId: string) => void;
  showRelated?: boolean;
  relatedDocuments?: {
    samePeriod: Report[];
    samePhysician: Report[];
  };
  variant?: "default" | "slim";
}

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

export function DocumentCard({ 
  report, 
  isSelected, 
  onSelect, 
  onNavigate, 
  showRelated = false,
  relatedDocuments,
  variant = "default",
}: DocumentCardProps) {
  const { downloadFile, isDownloading } = useFileDownload();
  const config = REPORT_TYPE_CONFIG[report.report_type as keyof typeof REPORT_TYPE_CONFIG] || REPORT_TYPE_CONFIG.general;

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

  const getPriorityIndicator = (priority: string) => {
    if (priority === 'high') {
      return <div className="w-1 h-full bg-primary rounded-l-lg" />;
    }
    return null;
  };

if (variant === "slim") {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-sm"
      onClick={() => onNavigate(report.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(report.id, checked as boolean)}
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="flex-shrink-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${config.color}`}>
              <span className="text-base">{config.icon}</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium truncate">{report.title}</h3>
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
                onNavigate(report.id);
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
}

return (
  <Card 
    className="cursor-pointer transition-all hover:shadow-md group relative overflow-hidden"
    onClick={() => onNavigate(report.id)}
  >
    {getPriorityIndicator(config.priority)}
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(report.id, checked as boolean)}
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-lg">{config.icon}</span>
            {getStatusIcon(report.parsing_status)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate">{report.title}</h3>
              <Badge className={config.color}>
                {report.report_type.replace('_', ' ')}
              </Badge>
              {report.is_critical && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Critical
                </Badge>
              )}
              {getStatusBadge(report.parsing_status, report.extraction_confidence)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-muted-foreground mb-3">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(report.report_date), 'MMM d, yyyy')}
              </div>
              {report.physician_name && (
                <div className="flex items-center">
                  <span className="text-xs mr-1">👨‍⚕️</span>
                  <span className="truncate">{report.physician_name}</span>
                </div>
              )}
              {report.facility_name && (
                <div className="flex items-center">
                  <span className="text-xs mr-1">🏥</span>
                  <span className="truncate">{report.facility_name}</span>
                </div>
              )}
              {report.file_size && (
                <div className="flex items-center">
                  <span className="text-xs mr-1">📊</span>
                  <span>{(report.file_size / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>
            
            {report.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {report.description}
              </p>
            )}
            
            {report.processing_error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 mb-3">
                <p className="text-sm text-destructive">
                  {report.processing_error}
                </p>
              </div>
            )}
            
            {report.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {report.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Related Documents */}
            {showRelated && relatedDocuments && (relatedDocuments.samePeriod.length > 0 || relatedDocuments.samePhysician.length > 0) && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 p-1 text-xs text-muted-foreground hover:text-foreground">
                    <Link className="h-3 w-3 mr-1" />
                    Related documents ({relatedDocuments.samePeriod.length + relatedDocuments.samePhysician.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {relatedDocuments.samePeriod.map(related => (
                    <div key={related.id} className="text-xs text-muted-foreground pl-4 border-l-2 border-muted">
                      <span className="font-medium">{related.title}</span> - Same period
                    </div>
                  ))}
                  {relatedDocuments.samePhysician.map(related => (
                    <div key={related.id} className="text-xs text-muted-foreground pl-4 border-l-2 border-primary/30">
                      <span className="font-medium">{related.title}</span> - Same physician
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(report.id);
                }}
                className="h-7 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              {report.file_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(report.id, report.file_name, report.file_url);
                  }}
                  disabled={isDownloading(report.id)}
                  className="h-7 w-7"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div onClick={(e) => e.stopPropagation()}>
          <ReportActions
            reportId={report.id}
            ocrStatus={report.parsing_status}
            reportTitle={report.title}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

}