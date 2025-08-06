import { useMemo } from "react";
import { format, isWithinInterval, subDays, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DocumentCard } from "./DocumentCard";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

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
}

const REPORT_TYPE_ORDER = {
  'blood_test': 1,
  'prescription': 2,
  'radiology': 3,
  'insurance': 4,
  'discharge': 5,
  'general': 6
};

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

export function TimelineView({ reports, selectedReports, onSelectReport, onNavigateToReport }: TimelineViewProps) {
  const { groupedReports, trends } = useMemo(() => {
    // Sort reports chronologically, then by type priority
    const sortedReports = [...reports].sort((a, b) => {
      const dateA = new Date(a.report_date);
      const dateB = new Date(b.report_date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime(); // Newest first
      }
      
      const orderA = REPORT_TYPE_ORDER[a.report_type as keyof typeof REPORT_TYPE_ORDER] || 999;
      const orderB = REPORT_TYPE_ORDER[b.report_type as keyof typeof REPORT_TYPE_ORDER] || 999;
      return orderA - orderB;
    });

    // Group by date ranges
    const groups: { [key: string]: Report[] } = {};
    const now = new Date();
    
    sortedReports.forEach(report => {
      const reportDate = new Date(report.report_date);
      let groupKey: string;
      
      if (isWithinInterval(reportDate, { start: startOfDay(subDays(now, 7)), end: endOfDay(now) })) {
        groupKey = 'This Week';
      } else if (isWithinInterval(reportDate, { start: startOfDay(subDays(now, 30)), end: endOfDay(now) })) {
        groupKey = 'This Month';
      } else if (isWithinInterval(reportDate, { start: startOfDay(subDays(now, 90)), end: endOfDay(now) })) {
        groupKey = 'Last 3 Months';
      } else if (isWithinInterval(reportDate, { start: startOfDay(subDays(now, 365)), end: endOfDay(now) })) {
        groupKey = 'This Year';
      } else {
        groupKey = format(reportDate, 'yyyy');
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(report);
    });

    // Calculate trends
    const lastMonth = reports.filter(r => 
      isWithinInterval(new Date(r.report_date), { 
        start: startOfDay(subDays(now, 30)), 
        end: endOfDay(now) 
      })
    );
    const previousMonth = reports.filter(r => 
      isWithinInterval(new Date(r.report_date), { 
        start: startOfDay(subDays(now, 60)), 
        end: startOfDay(subDays(now, 30))
      })
    );

    const trendData = {
      total: lastMonth.length - previousMonth.length,
      bloodTests: lastMonth.filter(r => r.report_type === 'blood_test').length - 
                  previousMonth.filter(r => r.report_type === 'blood_test').length,
      prescriptions: lastMonth.filter(r => r.report_type === 'prescription').length - 
                    previousMonth.filter(r => r.report_type === 'prescription').length,
    };

    return { groupedReports: groups, trends: trendData };
  }, [reports]);

  const getRelatedDocuments = (report: Report) => {
    // Simple relationship detection based on dates and types
    const reportDate = new Date(report.report_date);
    const samePeriod = reports.filter(r => {
      const rDate = new Date(r.report_date);
      const daysDiff = Math.abs((rDate.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
      return r.id !== report.id && daysDiff <= 7; // Within a week
    });

    const samePhysician = reports.filter(r => 
      r.id !== report.id && 
      r.physician_name && 
      report.physician_name && 
      r.physician_name === report.physician_name
    );

    return { samePeriod: samePeriod.slice(0, 3), samePhysician: samePhysician.slice(0, 2) };
  };

  return (
    <div className="space-y-6">
      {/* Trends Overview */}
      {reports.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium">Total Activity</span>
                    {trends.total > 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : trends.total < 0 ? (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.abs(trends.total)} {trends.total !== 0 ? 'vs last month' : 'no change'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <span className="text-sm">🩸</span>
                </div>
                <div>
                  <div className="text-sm font-medium">Blood Tests</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.abs(trends.bloodTests)} {trends.bloodTests !== 0 ? 'vs last month' : 'no change'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <span className="text-sm">💊</span>
                </div>
                <div>
                  <div className="text-sm font-medium">Prescriptions</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.abs(trends.prescriptions)} {trends.prescriptions !== 0 ? 'vs last month' : 'no change'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Groups */}
      {Object.entries(groupedReports).map(([period, periodReports]) => (
        <div key={period} className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-3 h-3 bg-primary rounded-full" />
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-px h-6 bg-border" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{period}</h3>
              <p className="text-sm text-muted-foreground">
                {periodReports.length} document{periodReports.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="ml-6 space-y-3">
            {periodReports.map((report, index) => {
              const config = REPORT_TYPE_CONFIG[report.report_type as keyof typeof REPORT_TYPE_CONFIG] || REPORT_TYPE_CONFIG.general;
              const related = getRelatedDocuments(report);
              const hasRelated = related.samePeriod.length > 0 || related.samePhysician.length > 0;

              return (
                <div key={report.id} className="relative">
                  {index < periodReports.length - 1 && (
                    <div className="absolute -left-6 top-8 w-px h-full bg-border" />
                  )}
                  
                  <DocumentCard
                    report={report}
                    isSelected={selectedReports.includes(report.id)}
                    onSelect={onSelectReport}
                    onNavigate={onNavigateToReport}
                    showRelated={hasRelated}
                    relatedDocuments={related}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(groupedReports).length === 0 && (
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