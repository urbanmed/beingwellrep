import { useState } from "react";
import { format, parseISO } from "date-fns";
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Brain, 
  Download, 
  Eye, 
  Pin, 
  Star,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useFileDownload } from "@/hooks/useFileDownload";
import { cn } from "@/lib/utils";

interface TimelineItem {
  id: string;
  type: 'report' | 'summary';
  title: string;
  date: string;
  description?: string;
  tags: string[];
  [key: string]: any;
}

interface EnhancedTimelineItemProps {
  item: TimelineItem;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (itemId: string, checked: boolean) => void;
  onToggleExpanded: (itemId: string) => void;
  onViewDetails: (item: TimelineItem) => void;
  showDate?: boolean;
}

export function EnhancedTimelineItem({ 
  item, 
  isSelected, 
  isExpanded, 
  onSelect, 
  onToggleExpanded, 
  onViewDetails, 
  showDate = true 
}: EnhancedTimelineItemProps) {
  const { downloadFile, isDownloading } = useFileDownload();
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, 'MMM d, yyyy • h:mm a');
  };

  const getStatusBadge = () => {
    if (item.type === 'report') {
      switch (item.parsingStatus) {
        case 'completed':
          return <Badge variant="default" className="text-xs">Processed</Badge>;
        case 'processing':
          return <Badge variant="secondary" className="text-xs">Processing</Badge>;
        case 'failed':
          return <Badge variant="destructive" className="text-xs">Failed</Badge>;
        default:
          return <Badge variant="outline" className="text-xs">Pending</Badge>;
      }
    } else {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs capitalize">
            {item.summaryType?.replace('_', ' ')}
          </Badge>
          {item.isPinned && <Pin className="h-3 w-3 text-primary" />}
          {item.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span className="text-xs">{item.rating}/5</span>
            </div>
          )}
        </div>
      );
    }
  };

  const getStatusIcon = () => {
    if (item.type === 'report') {
      switch (item.parsingStatus) {
        case 'completed':
          return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case 'processing':
          return <Clock className="h-4 w-4 text-yellow-600 animate-spin" />;
        case 'failed':
          return <XCircle className="h-4 w-4 text-red-600" />;
        default:
          return <Clock className="h-4 w-4 text-gray-400" />;
      }
    }
    return null;
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'report' && item.fileUrl && item.fileName) {
      await downloadFile(item.fileUrl, item.fileName);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(item);
  };

  const handleToggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded(item.id);
  };

  const handleSelect = (checked: boolean) => {
    // Only allow selection of reports for deletion
    if (item.type === 'report') {
      onSelect(item.id, checked);
    }
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Timeline marker */}
      <div className="absolute -left-8 top-4 z-10">
        <div className={cn(
          "w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
          item.type === 'report' ? "bg-blue-500" : "bg-purple-500"
        )}>
          {item.type === 'report' ? (
            <FileText className="h-2 w-2 text-white" />
          ) : (
            <Brain className="h-2 w-2 text-white" />
          )}
        </div>
      </div>

      <Card className={cn(
        "transition-all duration-200",
        isExpanded && "shadow-md",
        isHovered && "shadow-sm",
        item.isCritical && "border-orange-200 bg-orange-50/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Selection checkbox - only for reports */}
            {item.type === 'report' && (
              <div className={cn(
                "flex-shrink-0 transition-opacity duration-200",
                isHovered ? "opacity-100" : "opacity-0"
              )}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={handleSelect}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm truncate">{item.title}</h3>
                    {item.isCritical && (
                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    )}
                    {getStatusIcon()}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    {showDate && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.date)}
                      </span>
                    )}
                    {getStatusBadge()}
                  </div>

                  {/* Report-specific info */}
                  {item.type === 'report' && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {item.physician && (
                        <span>Dr. {item.physician}</span>
                      )}
                      {item.facility && (
                        <span>{item.facility}</span>
                      )}
                    </div>
                  )}

                  {/* Summary-specific info */}
                  {item.type === 'summary' && item.sourceReportIds && (
                    <div className="text-xs text-muted-foreground">
                      Based on {item.sourceReportIds.length} report{item.sourceReportIds.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleExpanded}
                  className="flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-3 animate-accordion-down">
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.description}
                    </p>
                  )}

                  {item.type === 'report' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {item.reportType && (
                        <div>
                          <span className="font-medium">Type:</span> {item.reportType}
                        </div>
                      )}
                      {item.extraction_confidence && (
                        <div>
                          <span className="font-medium">Confidence:</span> {Math.round(item.extraction_confidence * 100)}%
                        </div>
                      )}
                    </div>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={handleViewDetails}>
                      <Eye className="h-3 w-3 mr-2" />
                      View Details
                    </Button>
                    
                    {item.type === 'report' && item.fileUrl && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload}
                        disabled={isDownloading(item.id)}
                      >
                        <Download className="h-3 w-3 mr-2" />
                        {isDownloading(item.id) ? 'Downloading...' : 'Download'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}