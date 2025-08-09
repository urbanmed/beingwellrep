import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useFileDownload } from "@/hooks/useFileDownload";
import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Download, 
  Eye,
  Activity,
  Stethoscope,
  TestTube,
  Brain,
  Heart,
  Pill,
  Shield,
  AlertCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Report {
  id: string;
  title: string;
  report_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  parsing_status: string;
  extraction_confidence: number | null;
  parsing_confidence: number | null;
  processing_error: string | null;
  physician_name: string | null;
  facility_name: string | null;
  description: string | null;
  file_url: string | null;
  tags: string[];
  is_critical: boolean;
  report_date: string;
  notes: string | null;
  user_id: string;
  extracted_text: string | null;
  parsed_data: any | null;
  parsing_model: string | null;
}

interface GridViewProps {
  reports: Report[];
  selectedReports: string[];
  onSelectReport: (reportId: string, checked: boolean) => void;
  onNavigateToReport: (reportId: string) => void;
}

const REPORT_TYPE_CONFIG = {
  blood_test: { color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400", icon: TestTube, priority: 1 },
  lab_results: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400", icon: TestTube, priority: 1 },
  radiology: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400", icon: Brain, priority: 2 },
  procedure: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400", icon: Activity, priority: 2 },
  consultation: { color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", icon: Stethoscope, priority: 3 },
  prescription: { color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400", icon: Pill, priority: 3 },
  vaccination: { color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400", icon: Shield, priority: 2 },
  discharge: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", icon: FileText, priority: 2 },
  pathology: { color: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400", icon: TestTube, priority: 1 },
  allergy: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400", icon: AlertTriangle, priority: 2 },
  general: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400", icon: FileText, priority: 4 },
  cardiology: { color: "bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400", icon: Heart, priority: 1 },
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    case 'failed':
      return <AlertCircle className="h-3.5 w-3.5 text-red-600" />;
    case 'processing':
      return <Clock className="h-3.5 w-3.5 text-yellow-600 animate-pulse" />;
    default:
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const getStatusBadge = (report: Report) => {
  if (report.parsing_status === 'failed') {
    return <Badge variant="destructive" className="text-xs">Failed</Badge>;
  }
  if (report.parsing_status === 'processing') {
    return <Badge variant="warning" className="text-xs">Processing</Badge>;
  }
  if (report.extraction_confidence && report.extraction_confidence < 0.7) {
    return <Badge variant="warning" className="text-xs">Low Confidence</Badge>;
  }
  return <Badge variant="success" className="text-xs">Processed</Badge>;
};

const getPriorityIndicator = (reportType: string) => {
  const config = REPORT_TYPE_CONFIG[reportType as keyof typeof REPORT_TYPE_CONFIG];
  if (config?.priority === 1) {
    return <div className="w-1 h-6 bg-red-500 rounded-full" />;
  }
  if (config?.priority === 2) {
    return <div className="w-1 h-6 bg-yellow-500 rounded-full" />;
  }
  return null;
};

export function GridView({ reports, selectedReports, onSelectReport, onNavigateToReport }: GridViewProps) {
  const { downloadFile } = useFileDownload();

  const handleViewClick = (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    onNavigateToReport(reportId);
  };

  const handleDownloadClick = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    if (report.file_url) {
      downloadFile(report.file_url, report.file_name);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="grid gap-3">
      {reports.map((report) => {
        const config = REPORT_TYPE_CONFIG[report.report_type as keyof typeof REPORT_TYPE_CONFIG] || REPORT_TYPE_CONFIG.general;
        const IconComponent = config.icon;
        
        return (
          <Card 
            key={report.id}
            className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] border-l-4 border-l-transparent hover:border-l-primary/50"
            onClick={() => onNavigateToReport(report.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Selection checkbox */}
                <Checkbox
                  checked={selectedReports.includes(report.id)}
                  onCheckedChange={(checked) => onSelectReport(report.id, checked as boolean)}
                  className="mt-1 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Priority indicator */}
                <div className="flex-shrink-0 mt-1">
                  {getPriorityIndicator(report.report_type)}
                </div>

                {/* Report icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Title and critical indicator */}
                  <div className="flex items-start gap-2">
                    <h3 className="font-medium text-sm truncate leading-tight">
                      {report.title}
                    </h3>
                    {report.is_critical && (
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>

                  {/* Type and date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">
                      {report.report_type.replace(/_/g, ' ')}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(report.report_date), 'MMM d, yyyy')}</span>
                  </div>

                  {/* Physician and facility */}
                  {(report.physician_name || report.facility_name) && (
                    <div className="text-xs text-muted-foreground">
                      {report.physician_name && (
                        <span>{report.physician_name}</span>
                      )}
                      {report.physician_name && report.facility_name && (
                        <span> • </span>
                      )}
                      {report.facility_name && (
                        <span>{report.facility_name}</span>
                      )}
                    </div>
                  )}

                  {/* Status and file info */}
                  <div className="flex items-center gap-2">
                    {getStatusIcon(report.parsing_status)}
                    {getStatusBadge(report)}
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(report.file_size)}
                    </span>
                  </div>

                  {/* Error message */}
                  {report.processing_error && (
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                      {report.processing_error}
                    </div>
                  )}

                  {/* Tags */}
                  {report.tags && report.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {report.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {report.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          +{report.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => handleViewClick(e, report.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {report.file_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => handleDownloadClick(e, report)}
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
    </div>
  );
}