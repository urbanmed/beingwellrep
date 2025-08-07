import { useMemo } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { EnhancedTimelineItem } from "./EnhancedTimelineItem";
import { EnhancedTrendsOverview } from "./EnhancedTrendsOverview";
import { Activity } from "lucide-react";

interface TimelineItem {
  id: string;
  type: 'report' | 'summary';
  title: string;
  date: string;
  description?: string;
  tags: string[];
  [key: string]: any;
}

interface EnhancedTimelineViewProps {
  items: TimelineItem[];
  selectedReports: string[];
  expandedItems: Set<string>;
  onSelectReport: (itemId: string, checked: boolean) => void;
  onToggleExpanded: (itemId: string) => void;
  onViewDetails: (item: TimelineItem) => void;
  onNavigateToUpload?: () => void;
}

export function EnhancedTimelineView({ 
  items, 
  selectedReports, 
  expandedItems,
  onSelectReport, 
  onToggleExpanded,
  onViewDetails, 
  onNavigateToUpload 
}: EnhancedTimelineViewProps) {
  const groupedByDate = useMemo(() => {
    // Sort items chronologically (newest first)
    const sortedItems = [...items].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Group by exact date
    const groups: { [key: string]: TimelineItem[] } = {};
    
    sortedItems.forEach(item => {
      const itemDate = parseISO(item.date);
      const dateKey = format(itemDate, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return groups;
  }, [items]);

  // Extract reports for trends overview - convert to proper report format
  const reports = useMemo(() => {
    return items
      .filter(item => item.type === 'report')
      .map(item => ({
        id: item.id,
        title: item.title,
        report_type: item.reportType || '',
        parsing_status: item.parsingStatus || '',
        parsed_data: item.parsed_data || null,
        extraction_confidence: item.extraction_confidence || null,
        parsing_confidence: item.parsing_confidence || null,
        extracted_text: item.extracted_text || null,
        file_url: item.fileUrl || null,
        physician_name: item.physician || null,
        facility_name: item.facility || null,
        report_date: item.date,
        created_at: item.created_at || item.date,
        updated_at: item.updated_at || item.date,
        is_critical: item.isCritical || false,
        file_size: item.file_size || null,
        file_name: item.fileName || '',
        tags: item.tags || [],
        description: item.description,
        processing_error: item.processing_error,
        notes: item.notes || null,
        user_id: item.user_id || '',
        parsing_model: item.parsing_model || null
      }));
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Enhanced Trends Overview */}
      {reports.length > 0 && (
        <EnhancedTrendsOverview 
          reports={reports} 
          onNavigateToUpload={onNavigateToUpload}
        />
      )}

      {/* Timeline */}
      {Object.keys(groupedByDate).length > 0 ? (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-8">
            {Object.entries(groupedByDate).map(([dateKey, dayItems], groupIndex) => {
              const date = parseISO(dateKey);
              const isToday = isSameDay(date, new Date());
              const isYesterday = isSameDay(date, new Date(Date.now() - 24 * 60 * 60 * 1000));
              
              let dateLabel: string;
              if (isToday) {
                dateLabel = 'Today';
              } else if (isYesterday) {
                dateLabel = 'Yesterday';
              } else {
                dateLabel = format(date, 'EEEE, MMMM d, yyyy');
              }

              return (
                <div key={dateKey} className="relative">
                  {/* Date header */}
                  <div className="flex items-center mb-4">
                    <div className="relative z-10 bg-background pr-4">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {dateLabel}
                      </h3>
                    </div>
                    <div className="flex-1 h-px bg-border ml-4" />
                  </div>

                  {/* Items for this date */}
                  <div className="ml-4 space-y-4">
                    {dayItems.map((item, itemIndex) => (
                      <EnhancedTimelineItem
                        key={item.id}
                        item={item}
                        isSelected={selectedReports.includes(item.id)}
                        isExpanded={expandedItems.has(item.id)}
                        onSelect={onSelectReport}
                        onToggleExpanded={onToggleExpanded}
                        onViewDetails={onViewDetails}
                        showDate={false}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No items found matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}