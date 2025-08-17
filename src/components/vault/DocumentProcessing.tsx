import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { TimelineFilters } from "@/components/timeline/TimelineFilters";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { useTimeline, TimelineItem as TimelineItemType } from "@/hooks/useTimeline";
import { ViewModeSelector, ViewMode } from "@/components/vault/ViewModeSelector";
import { MixedGridView } from "@/components/vault/MixedGridView";
import { DeleteConfirmDialog } from "@/components/reports/DeleteConfirmDialog";
import { DeleteSummaryDialog } from "@/components/summaries/DeleteSummaryDialog";
import { useReports } from "@/hooks/useReports";
import { useSummaries } from "@/hooks/useSummaries";


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
    toggleItemExpanded,
    refetch,
  } = useTimeline();

  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [selectedItem, setSelectedItem] = useState<TimelineItemType | null>(null);
  const [openReportDelete, setOpenReportDelete] = useState(false);
  const [openSummaryDelete, setOpenSummaryDelete] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openBulkDelete, setOpenBulkDelete] = useState(false);

  const { deleteReport, deleteMultipleReports } = useReports();
  const { deleteSummary } = useSummaries();

  const handleViewDetails = (item: TimelineItemType) => {
    if (item.type === 'summary') {
      navigate(`/summaries?id=${item.id}`);
    } else {
      navigate(`/vault/${item.id}`);
    }
  };

  const handleDeleteRequest = (item: TimelineItemType) => {
    setSelectedItem(item);
    if (item.type === 'report') {
      setOpenReportDelete(true);
    } else {
      setOpenSummaryDelete(true);
    }
  };

  const handleConfirmReportDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteReport(selectedItem.id);
      setOpenReportDelete(false);
      setSelectedItem(null);
      await refetch();
    } catch (e) {
      // Errors are surfaced via toasts in hooks
    }
  };

  const handleConfirmSummaryDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteSummary(selectedItem.id);
      setOpenSummaryDelete(false);
      setSelectedItem(null);
      await refetch();
    } catch (e) {
      // Errors are surfaced via toasts in hooks
    }
  };

  // Selection handlers
  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const handleToggleItemSelect = (item: TimelineItemType, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleConfirmBulkDelete = async () => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    const reportIds = selected.filter((i) => i.type === 'report').map((i) => i.id);
    const summaryIds = selected.filter((i) => i.type === 'summary').map((i) => i.id);
    try {
      if (reportIds.length) {
        await deleteMultipleReports(reportIds);
      }
      if (summaryIds.length) {
        await Promise.all(summaryIds.map((id) => deleteSummary(id)));
      }
      setOpenBulkDelete(false);
      setSelectedIds(new Set());
      setSelectionMode(false);
      await refetch();
    } catch (e) {
      // handled by hooks toasts
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

  const statusGroupedItems = groupedItems as Record<string, TimelineItemType[]>;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <section className="space-y-3 pt-safe-offset-header">
      {selectionMode && (
        <div className="flex items-center justify-between rounded-md border p-2 sm:p-3 bg-muted/30">
          <div className="text-xs sm:text-sm">{selectedIds.size} selected</div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs sm:text-sm">
              {selectedIds.size === items.length ? "Clear all" : "Select all"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setOpenBulkDelete(true)}
              disabled={selectedIds.size === 0}
              className="text-xs sm:text-sm"
            >
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {viewMode === 'timeline' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-center">
                  <div className="text-lg sm:text-2xl font-bold text-primary">{stats.totalReports}</div>
                  <div className="text-xs text-muted-foreground">Reports</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-center">
                  <div className="text-lg sm:text-2xl font-bold text-success">{stats.processedReports}</div>
                  <div className="text-xs text-muted-foreground">Processed</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-center">
                  <div className="text-lg sm:text-2xl font-bold text-accent-foreground">{stats.totalSummaries}</div>
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

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            <Button 
              variant={selectionMode ? "secondary" : "outline"} 
              size="sm" 
              onClick={toggleSelectionMode} 
              className="text-xs"
            >
              {selectionMode ? "Cancel" : "Select"}
            </Button>
            <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>

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
                        onDelete={handleDeleteRequest}
                        selectionMode={selectionMode}
                        selected={selectedIds.has(item.id)}
                        onSelectChange={(checked) => handleToggleItemSelect(item, checked)}
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
          {viewMode === 'card' ? (
            <MixedGridView
              items={items}
              onViewDetails={handleViewDetails}
              onDelete={handleDeleteRequest}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleItemSelect}
            />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpanded={() => toggleItemExpanded(item.id)}
                  onViewDetails={handleViewDetails}
                  onDelete={handleDeleteRequest}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item.id)}
                  onSelectChange={(checked) => handleToggleItemSelect(item, checked)}
                  compact
                />
              ))}
            </div>
          )}
        </>
      )}
      {/* Delete dialogs */}
      <DeleteConfirmDialog
        isOpen={openBulkDelete}
        onClose={() => setOpenBulkDelete(false)}
        onConfirm={handleConfirmBulkDelete}
        title={`Delete ${selectedIds.size} selected item${selectedIds.size !== 1 ? 's' : ''}?`}
        description={`This will permanently delete ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''} (reports and summaries). This action cannot be undone.`}
      />
      <DeleteConfirmDialog
        isOpen={openReportDelete}
        onClose={() => setOpenReportDelete(false)}
        onConfirm={handleConfirmReportDelete}
      />
      <DeleteSummaryDialog
        isOpen={openSummaryDelete}
        onClose={() => setOpenSummaryDelete(false)}
        onConfirm={handleConfirmSummaryDelete}
        summaryTitle={selectedItem?.title}
      />
    </section>
  );
}
