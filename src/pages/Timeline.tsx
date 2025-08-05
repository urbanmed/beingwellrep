import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelineFilters } from "@/components/timeline/TimelineFilters";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { useTimeline, TimelineItem as TimelineItemType } from "@/hooks/useTimeline";
import { MobileLayout } from "@/components/layout/MobileLayout";

export default function Timeline() {
  const navigate = useNavigate();
  const {
    items,
    groupedItems,
    filters,
    expandedItems,
    availableTags,
    loading,
    updateFilters,
    toggleItemExpanded
  } = useTimeline();

  const [selectedItem, setSelectedItem] = useState<TimelineItemType | null>(null);

  const handleViewDetails = (item: TimelineItemType) => {
    if (item.type === 'report') {
      navigate('/reports');
    } else {
      navigate('/summaries');
    }
  };

  const getStats = () => {
    const totalReports = items.filter(item => item.type === 'report').length;
    const totalSummaries = items.filter(item => item.type === 'summary').length;
    const processedReports = items.filter(item => 
      item.type === 'report' && item.parsingStatus === 'completed'
    ).length;

    return { totalReports, totalSummaries, processedReports };
  };

  const stats = getStats();

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Health Timeline
          </h1>
          <p className="text-muted-foreground">
            Your complete health journey in chronological order
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalReports}</div>
                <div className="text-xs text-muted-foreground">Reports</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.processedReports}</div>
                <div className="text-xs text-muted-foreground">Processed</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.totalSummaries}</div>
                <div className="text-xs text-muted-foreground">Summaries</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <TimelineFilters
          filters={filters}
          availableTags={availableTags}
          onFiltersChange={updateFilters}
        />

        {/* Timeline Content */}
        <div className="space-y-6">
          {Object.keys(groupedItems).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items found</h3>
                <p className="text-muted-foreground">
                  {filters.search || filters.type !== 'all' || filters.dateRange !== 'all' || filters.tags.length > 0
                    ? "Try adjusting your filters to see more results."
                    : "Start by uploading your first medical report to build your timeline."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedItems).map(([period, periodItems]) => (
              <div key={period} className="space-y-3">
                <div className="flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
                  <h2 className="text-lg font-semibold">{period}</h2>
                  <div className="text-sm text-muted-foreground">
                    ({periodItems.length} item{periodItems.length !== 1 ? 's' : ''})
                  </div>
                </div>
                
                <div className="space-y-3">
                  {periodItems.map((item) => (
                    <TimelineItem
                      key={item.id}
                      item={item}
                      isExpanded={expandedItems.has(item.id)}
                      onToggleExpanded={() => toggleItemExpanded(item.id)}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}