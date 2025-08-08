import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText } from "lucide-react";
import { useFileDownload } from "@/hooks/useFileDownload";

import { ReportNotesButton } from "@/components/notes/ReportNotesButton";

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

interface TimelineItemProps {
  report: Report;
  isSelected: boolean;
  onSelect: (reportId: string, checked: boolean) => void;
  onNavigate: (reportId: string) => void;
  showDate?: boolean;
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

export function TimelineItem({ report, isSelected, onSelect, onNavigate, showDate = true }: TimelineItemProps) {
  const { downloadFile } = useFileDownload();
  const config = REPORT_TYPE_CONFIG[report.report_type as keyof typeof REPORT_TYPE_CONFIG] || REPORT_TYPE_CONFIG.general;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (report.file_url) {
      downloadFile(report.file_url, report.file_name);
    }
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(report.id);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(report.id);
  };

  return (
    <div className="relative flex items-start space-x-4 group">
      {/* Timeline marker */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm" />
        {showDate && (
          <div className="absolute -left-8 top-6 text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date(report.report_date), 'MMM d')}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <button
                onClick={handleTitleClick}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer truncate"
              >
                {report.title}
              </button>
              {report.is_critical && (
                <div className="w-2 h-2 bg-destructive rounded-full" />
              )}
            </div>
            
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="secondary" className={`text-xs ${config.color}`}>
                {config.icon} {report.report_type.replace('_', ' ')}
              </Badge>
              {report.is_critical && (
                <Badge variant="destructive" className="text-xs">Flagged</Badge>
              )}
              {report.parsing_status === 'completed' && (
                <Badge variant="outline" className="text-xs">
                  ✓ Processed
                </Badge>
              )}
              {report.parsing_status === 'failed' && (
                <Badge variant="destructive" className="text-xs">
                  ✗ Failed
                </Badge>
              )}
            </div>

            {(report.physician_name || report.facility_name) && (
              <div className="text-xs text-muted-foreground mb-1">
                {report.physician_name && `Dr. ${report.physician_name}`}
                {report.physician_name && report.facility_name && ' • '}
                {report.facility_name}
              </div>
            )}

            {report.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {report.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <ReportNotesButton reportId={report.id} reportTitle={report.title} />
            {report.file_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-8 w-8 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}