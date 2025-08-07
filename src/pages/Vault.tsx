import { useState, useMemo } from "react";
import { Search, Filter, Clock, Plus, Trash2, FolderOpen, Upload, Grid, List, Activity, TrendingUp, Calendar, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReports } from "@/hooks/useReports";
import { useSummaries } from "@/hooks/useSummaries";
import { DeleteConfirmDialog } from "@/components/reports/DeleteConfirmDialog";
import { TimelineFilters } from "@/components/vault/TimelineFilters";
import { GridView } from "@/components/vault/GridView";
import { EnhancedTimelineView } from "@/components/vault/EnhancedTimelineView";

import { useNavigate } from "react-router-dom";
import { isWithinInterval, startOfDay, endOfDay, subDays, format, parseISO } from "date-fns";

// Filter mapping for the new categorized system
const FILTER_CATEGORIES = [
  {
    id: "lab-work",
    subcategories: [
      { id: "blood-tests", reportTypes: ["blood_test", "lab_results"] },
      { id: "urinalysis", reportTypes: ["lab_results"] },
      { id: "hormone-tests", reportTypes: ["lab_results"] },
      { id: "allergy-testing", reportTypes: ["allergy"] },
    ]
  },
  {
    id: "imaging",
    subcategories: [
      { id: "xrays", reportTypes: ["radiology"] },
      { id: "mri-scans", reportTypes: ["radiology"] },
      { id: "ct-scans", reportTypes: ["radiology"] },
      { id: "ultrasounds", reportTypes: ["radiology"] },
      { id: "mammograms", reportTypes: ["radiology"] },
    ]
  },
  {
    id: "procedures",
    subcategories: [
      { id: "cardiac-procedures", reportTypes: ["procedure"] },
      { id: "surgical-reports", reportTypes: ["procedure"] },
      { id: "endoscopy", reportTypes: ["procedure"] },
      { id: "biopsy", reportTypes: ["procedure", "pathology"] },
    ]
  },
  {
    id: "consultations",
    subcategories: [
      { id: "specialist-consults", reportTypes: ["consultation"] },
      { id: "follow-up-notes", reportTypes: ["consultation"] },
      { id: "treatment-plans", reportTypes: ["consultation"] },
      { id: "referrals", reportTypes: ["consultation"] },
    ]
  },
  {
    id: "medications",
    subcategories: [
      { id: "prescriptions", reportTypes: ["prescription"] },
      { id: "medication-reviews", reportTypes: ["consultation"] },
      { id: "dosage-changes", reportTypes: ["prescription"] },
    ]
  },
  {
    id: "preventive",
    subcategories: [
      { id: "vaccinations", reportTypes: ["vaccination"] },
      { id: "screenings", reportTypes: ["general", "consultation"] },
      { id: "wellness-visits", reportTypes: ["consultation"] },
    ]
  },
  {
    id: "emergency",
    subcategories: [
      { id: "er-visits", reportTypes: ["general", "consultation"] },
      { id: "urgent-care", reportTypes: ["consultation"] },
      { id: "discharge-summaries", reportTypes: ["discharge"] },
    ]
  }
];

const TIME_FILTERS = [
  { id: "last-7-days", days: 7 },
  { id: "last-30-days", days: 30 },
  { id: "last-90-days", days: 90 },
  { id: "last-year", days: 365 },
];

const SPECIAL_FILTERS = [
  { id: "critical-reports", condition: "is_critical" },
  { id: "processing-errors", condition: "failed_processing" },
  { id: "missing-data", condition: "incomplete_data" },
];

// Helper functions for filter matching
const checkCategoryFilter = (filterId: string, report: any): boolean | null => {
  for (const category of FILTER_CATEGORIES) {
    const subcategory = category.subcategories.find(sub => sub.id === filterId);
    if (subcategory) {
      return subcategory.reportTypes.includes(report.report_type);
    }
  }
  return null;
};

const checkTimeFilter = (filterId: string, report: any, now: Date): boolean | null => {
  const timeFilter = TIME_FILTERS.find(f => f.id === filterId);
  if (timeFilter) {
    return isWithinInterval(new Date(report.report_date), {
      start: startOfDay(subDays(now, timeFilter.days)),
      end: endOfDay(now)
    });
  }
  return null;
};

const checkSpecialFilter = (filterId: string, report: any): boolean | null => {
  const specialFilter = SPECIAL_FILTERS.find(f => f.id === filterId);
  if (specialFilter) {
    switch (specialFilter.condition) {
      case "is_critical":
        return !!report.is_critical;
      case "failed_processing":
        return report.parsing_status === "failed";
      case "incomplete_data":
        return !report.physician_name || !report.facility_name || !report.extracted_text;
      default:
        return false;
    }
  }
  return null;
};

export default function Vault() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"timeline" | "grid">("timeline");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [itemTypeFilter, setItemTypeFilter] = useState<"all" | "reports" | "summaries">("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const { reports, loading: reportsLoading, deleteMultipleReports } = useReports();
  const { summaries, loading: summariesLoading } = useSummaries();

  const loading = reportsLoading || summariesLoading;

  // Combined timeline items from reports and summaries
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'report' | 'summary';
      title: string;
      date: string;
      description?: string;
      tags: string[];
      [key: string]: any;
    }> = [];

    // Add reports
    if (itemTypeFilter === 'all' || itemTypeFilter === 'reports') {
      reports.forEach(report => {
        items.push({
          id: report.id,
          type: 'report',
          title: report.title,
          date: report.report_date,
          description: report.extracted_text?.substring(0, 200) + '...',
          tags: report.tags || [],
          reportType: report.report_type,
          facility: report.facility_name,
          physician: report.physician_name,
          parsingStatus: report.parsing_status,
          isCritical: report.is_critical,
          fileUrl: report.file_url,
          fileName: report.file_name,
          ...report
        });
      });
    }

    // Add summaries
    if (itemTypeFilter === 'all' || itemTypeFilter === 'summaries') {
      summaries.forEach(summary => {
        items.push({
          id: summary.id,
          type: 'summary',
          title: summary.title,
          date: summary.generated_at,
          description: typeof summary.content === 'string' ? summary.content.substring(0, 200) + '...' : '',
          tags: [],
          summaryType: summary.summary_type,
          sourceReportIds: summary.source_report_ids,
          isPinned: summary.is_pinned,
          rating: summary.user_rating,
          ...summary
        });
      });
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, summaries, itemTypeFilter]);

  const filteredItems = useMemo(() => {
    return timelineItems.filter(item => {
      // Search filter
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.type === 'report' && (
          item.reportType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.physician?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.facility?.toLowerCase().includes(searchQuery.toLowerCase())
        )) ||
        (item.type === 'summary' && item.summaryType?.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Date range filter
      if (dateRange.start || dateRange.end) {
        const itemDate = new Date(item.date);
        if (dateRange.start && dateRange.end) {
          if (!isWithinInterval(itemDate, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) })) {
            return false;
          }
        } else if (dateRange.start) {
          if (itemDate < startOfDay(dateRange.start)) return false;
        } else if (dateRange.end) {
          if (itemDate > endOfDay(dateRange.end)) return false;
        }
      }

      // Apply active filters (only for reports)
      if (item.type === 'report') {
        const now = new Date();
        for (const filterId of activeFilters) {
          let filterMatched = false;

          // Check medical category filters
          const categoryFilterMatch = checkCategoryFilter(filterId, item);
          if (categoryFilterMatch !== null) {
            if (!categoryFilterMatch) return false;
            filterMatched = true;
          }

          // Check time-based filters
          if (!filterMatched) {
            const timeFilterMatch = checkTimeFilter(filterId, item, now);
            if (timeFilterMatch !== null) {
              if (!timeFilterMatch) return false;
              filterMatched = true;
            }
          }

          // Check special filters
          if (!filterMatched) {
            const specialFilterMatch = checkSpecialFilter(filterId, item);
            if (specialFilterMatch !== null) {
              if (!specialFilterMatch) return false;
              filterMatched = true;
            }
          }
        }
      }

      return true;
    });
  }, [timelineItems, searchQuery, activeFilters, dateRange]);

  // For backward compatibility with grid view (reports only)
  const filteredReports = useMemo(() => {
    return filteredItems
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
  }, [filteredItems]);

  const handleSelectReport = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedForDeletion(prev => [...prev, reportId]);
    } else {
      setSelectedForDeletion(prev => prev.filter(id => id !== reportId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only allow selection of reports for deletion
      const reportIds = filteredItems.filter(item => item.type === 'report').map(r => r.id);
      setSelectedForDeletion(reportIds);
    } else {
      setSelectedForDeletion([]);
    }
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleViewDetails = (item: any) => {
    if (item.type === 'summary') {
      navigate(`/summaries?id=${item.id}`);
    } else {
      navigate(`/reports/${item.id}`);
    }
  };

  const getStats = () => {
    const totalReports = timelineItems.filter(item => item.type === 'report').length;
    const totalSummaries = timelineItems.filter(item => item.type === 'summary').length;
    const processedReports = timelineItems.filter(item => 
      item.type === 'report' && item.parsingStatus === 'completed'
    ).length;

    return { totalReports, totalSummaries, processedReports };
  };

  const handleBulkDelete = async () => {
    setShowDeleteDialog(false);
    await deleteMultipleReports(selectedForDeletion);
    setSelectedForDeletion([]);
  };

  const handleClearAllFilters = () => {
    setActiveFilters([]);
    setDateRange({ start: null, end: null });
    setSearchQuery("");
    setItemTypeFilter("all");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading vault...</span>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FolderOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Document Vault</h1>
            <p className="text-muted-foreground">Intelligent health document management</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setViewMode(viewMode === "timeline" ? "grid" : "timeline")}>
            {viewMode === "timeline" ? <Grid className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
          </Button>
          <Button onClick={() => navigate("/upload")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Documents
          </Button>
        </div>
      </div>


      {timelineItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Your Vault is Empty</CardTitle>
            <CardDescription className="mb-6 max-w-md mx-auto">
              Start building your digital health record by uploading your first medical document.
            </CardDescription>
            <Button onClick={() => navigate("/upload")} size="lg">
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{getStats().totalReports}</div>
                  <div className="text-xs text-muted-foreground">Reports</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{getStats().processedReports}</div>
                  <div className="text-xs text-muted-foreground">Processed</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{getStats().totalSummaries}</div>
                  <div className="text-xs text-muted-foreground">Summaries</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search documents, summaries, physician, or facility..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedForDeletion.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedForDeletion.length})
              </Button>
            )}
          </div>

          {/* Enhanced Filters with Type Selection */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Button
                  variant={itemTypeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setItemTypeFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={itemTypeFilter === "reports" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setItemTypeFilter("reports")}
                >
                  Reports
                </Button>
                <Button
                  variant={itemTypeFilter === "summaries" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setItemTypeFilter("summaries")}
                >
                  Summaries
                </Button>
              </div>

              {/* Smart Filters */}
              <TimelineFilters
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onClearAll={handleClearAllFilters}
              />
            </div>

            {/* View Toggle and Selection Controls */}
            <div className="flex items-center gap-6">
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "timeline" | "grid")}>
                <TabsList>
                  <TabsTrigger value="timeline" className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Timeline</span>
                  </TabsTrigger>
                  <TabsTrigger value="grid" className="flex items-center space-x-2">
                    <Grid className="h-4 w-4" />
                    <span>Grid</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Selection Controls - only for reports */}
              {filteredReports.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedForDeletion.length === filteredReports.length && filteredReports.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    Select All Reports
                  </label>
                  {selectedForDeletion.length > 0 && (
                    <span className="text-destructive">{selectedForDeletion.length} selected</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "timeline" | "grid")}>

            <TabsContent value="timeline" className="mt-6">
              <EnhancedTimelineView
                items={filteredItems}
                selectedReports={selectedForDeletion}
                expandedItems={expandedItems}
                onSelectReport={handleSelectReport}
                onToggleExpanded={toggleItemExpanded}
                onViewDetails={handleViewDetails}
                onNavigateToUpload={() => navigate("/upload")}
              />
            </TabsContent>

            <TabsContent value="grid" className="mt-6">
              <GridView
                reports={filteredReports}
                selectedReports={selectedForDeletion}
                onSelectReport={handleSelectReport}
                onNavigateToReport={(reportId) => navigate(`/reports/${reportId}`)}
              />
            </TabsContent>
          </Tabs>

          {filteredItems.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No documents found matching your filters.</p>
                <Button variant="outline" className="mt-4" onClick={handleClearAllFilters}>
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        isMultiple={true}
        count={selectedForDeletion.length}
      />
    </div>
  );
}