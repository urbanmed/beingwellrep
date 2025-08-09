import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, FileText, Brain, Download, Eye, Pin, Star, Trash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimelineItem as TimelineItemType } from "@/hooks/useTimeline";
import { useFileDownload } from "@/hooks/useFileDownload";
import { cn } from "@/lib/utils";
import { ReportNotesButton } from "@/components/notes/ReportNotesButton";

interface TimelineItemProps {
  item: TimelineItemType;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onViewDetails?: (item: TimelineItemType) => void;
  onEditReport?: (item: TimelineItemType) => void;
  onDelete?: (item: TimelineItemType) => void;
  compact?: boolean;
}

export function TimelineItem({ item, isExpanded, onToggleExpanded, onViewDetails, onEditReport, onDelete, compact = false }: TimelineItemProps) {
  const { downloadFile, isDownloading } = useFileDownload();

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
              <Star className="h-3 w-3 text-warning fill-current" />
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
      isExpanded && "shadow-md",
      compact && "hover:shadow-sm"
    )}>
      <CardContent className={cn(compact ? "p-3" : "p-4")}> 
        <div className={cn("flex items-start", compact ? "gap-2" : "gap-3")}> 
          <div className={cn(
            "flex-shrink-0 rounded-full flex items-center justify-center",
            item.type === 'report' ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground",
            compact ? "w-7 h-7" : "w-8 h-8"
          )}>
            {item.type === 'report' ? (
              <FileText className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
            ) : (
              <Brain className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>{item.title}</h3>
                <div className={cn("flex items-center gap-2 mt-1")}> 
                  <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                  {getStatusBadge()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpanded}
                className="flex-shrink-0 h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>

            {isExpanded && (
              <div className={cn("space-y-3 animate-accordion-down", compact ? "mt-2" : "mt-3")}> 
                {item.description && (
                  <p className={cn("text-muted-foreground line-clamp-3", compact ? "text-xs" : "text-sm")}>
                    {item.description}
                  </p>
                )}

                {item.type === 'report' && (
                  <div className={cn("grid grid-cols-2 gap-2", compact ? "text-[11px]" : "text-xs")}>
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
                  <div className={cn(compact ? "text-[11px]" : "text-xs")}> 
                    <span className="font-medium">Based on:</span> {item.sourceReportIds.length} report(s)
                  </div>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-[11px]"> 
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1"> 
                  <Button variant="outline" size="sm" onClick={handleViewDetails} className={cn(compact && "h-8 px-2")}> 
                    <Eye className={cn("mr-2", compact ? "h-3 w-3" : "h-3 w-3")} />
                    View
                  </Button>
                  {item.type === 'report' && (
                    <>
                      <ReportNotesButton reportId={item.id} reportTitle={item.title} />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onEditReport?.(item)}
                        className={cn(compact && "h-8 px-2")}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload}
                        disabled={isDownloading(item.id)}
                        className={cn(compact && "h-8 px-2")}
                      >
                        <Download className="h-3 w-3 mr-2" />
                        {isDownloading(item.id) ? 'Downloading...' : 'Download'}
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDelete?.(item)}
                    className={cn("ml-auto h-8 w-8 p-0", compact && "h-8 w-8")}
                    aria-label="Delete"
                    title="Delete"
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
