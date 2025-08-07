import { useMemo } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { TimelineItem } from "./TimelineItem";
import { EnhancedTrendsOverview } from "./EnhancedTrendsOverview";
import { Activity } from "lucide-react";

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

interface TimelineViewProps {
  reports: Report[];
  selectedReports: string[];
  onSelectReport: (reportId: string, checked: boolean) => void;
  onNavigateToReport: (reportId: string) => void;
  onNavigateToUpload?: () => void;
}


export function TimelineView({ reports, selectedReports, onSelectReport, onNavigateToReport, onNavigateToUpload }: TimelineViewProps) {
  const groupedByDate = useMemo(() => {
    // Sort reports chronologically (newest first)
    const sortedReports = [...reports].sort((a, b) => {
      return new Date(b.report_date).getTime() - new Date(a.report_date).getTime();
    });

    // Group by exact date
    const groups: { [key: string]: Report[] } = {};
    
    sortedReports.forEach(report => {
      const reportDate = parseISO(report.report_date);
      const dateKey = format(reportDate, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(report);
    });

    return groups;
  }, [reports]);

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
            {Object.entries(groupedByDate).map(([dateKey, dayReports], groupIndex) => {
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

                  {/* Documents for this date */}
                  <div className="ml-4 space-y-4">
                    {dayReports.map((report, reportIndex) => (
                      <TimelineItem
                        key={report.id}
                        report={report}
                        isSelected={selectedReports.includes(report.id)}
                        onSelect={onSelectReport}
                        onNavigate={onNavigateToReport}
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
            <p className="text-muted-foreground">No documents found matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}