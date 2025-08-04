import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, FileText, Brain, Download, Eye, Pin, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimelineItem as TimelineItemType } from "@/hooks/useTimeline";
import { useFileDownload } from "@/hooks/useFileDownload";
import { cn } from "@/lib/utils";

interface TimelineItemProps {
  item: TimelineItemType;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onViewDetails?: (item: TimelineItemType) => void;
}

export function TimelineItem({ item, isExpanded, onToggleExpanded, onViewDetails }: TimelineItemProps) {
  const { downloadFile, isDownloading } = useFileDownload();
  const [imageError, setImageError] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, 'MMM d, yyyy • h:mm a');
  };

  const getStatusBadge = () => {
    if (item.type === 'report') {
      switch (item.ocrStatus) {
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

  const handleDownload = async () => {
    // For reports, we would need the file URL from the report data
    // This is a simplified version - in reality, you'd get this from the report
    console.log('Download requested for:', item.id);
  };

  const handleViewDetails = () => {
    onViewDetails?.(item);
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isExpanded && "shadow-md"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            item.type === 'report' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
          )}>
            {item.type === 'report' ? (
              <FileText className="h-4 w-4" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{item.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.date)}
                  </span>
                  {getStatusBadge()}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpanded}
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
                    {item.facility && (
                      <div>
                        <span className="font-medium">Facility:</span> {item.facility}
                      </div>
                    )}
                    {item.physician && (
                      <div className="col-span-2">
                        <span className="font-medium">Physician:</span> {item.physician}
                      </div>
                    )}
                  </div>
                )}

                {item.type === 'summary' && item.sourceReportIds && item.sourceReportIds.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium">Based on:</span> {item.sourceReportIds.length} report(s)
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
                  
                  {item.type === 'report' && (
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
  );
}