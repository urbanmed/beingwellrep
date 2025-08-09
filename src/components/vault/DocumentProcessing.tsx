import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { TimelineFilters } from "@/components/timeline/TimelineFilters";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { useTimeline, TimelineItem as TimelineItemType } from "@/hooks/useTimeline";


export function DocumentProcessing() {
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
  const [mode, setMode] = useState<'tracker' | 'processed'>("tracker");
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');

  const handleViewDetails = (item: TimelineItemType) => {
    if (item.type === 'summary') {
      navigate(`/summaries?id=${item.id}`);
    } else {
      navigate(`/reports/${item.id}`);
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

  const statusMatches = (it: TimelineItemType) =>
    statusFilter === 'all' || (it.type !== 'report' ? true : it.parsingStatus === statusFilter);

  const processedItems = items.filter((item) => item.type === 'report' && statusMatches(item));

  const statusGroupedItems = Object.fromEntries(
    Object.entries(groupedItems)
      .map(([period, arr]) => [period, (arr as TimelineItemType[]).filter(statusMatches)])
      .filter(([, arr]) => (arr as TimelineItemType[]).length > 0)
  ) as Record<string, TimelineItemType[]>;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {/* Page header */}

      {/* Status filter */}
      

      {mode === 'tracker' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalReports}</div>
                  <div className="text-xs text-muted-foreground">Reports</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{stats.processedReports}</div>
                  <div className="text-xs text-muted-foreground">Processed</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-foreground">{stats.totalSummaries}</div>
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
          <div className="space-y-3">
            {Object.keys(statusGroupedItems).length === 0 ? (
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
              Object.entries(statusGroupedItems).map(([period, periodItems]) => (
                <div key={period} className="space-y-3">
                  <div className="flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
                    <h3 className="text-lg font-semibold">{period}</h3>
                    <div className="text-sm text-muted-foreground">
                      ({periodItems.length} item{periodItems.length !== 1 ? 's' : ''})
                    </div>
                  </div>

                  <div className="space-y-2">
                    {periodItems.map((item) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        isExpanded={expandedItems.has(item.id)}
                        onToggleExpanded={() => toggleItemExpanded(item.id)}
                        onViewDetails={handleViewDetails}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {processedItems.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No processed documents yet.</div>
          ) : (
            <div className="space-y-2">
              {processedItems.map((item) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpanded={() => toggleItemExpanded(item.id)}
                  onViewDetails={handleViewDetails}
                  compact
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
