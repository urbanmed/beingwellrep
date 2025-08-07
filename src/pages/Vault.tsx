import { useState, useMemo } from "react";
import { Search, Filter, Clock, Plus, Trash2, FolderOpen, Upload, Grid, List, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReports } from "@/hooks/useReports";
import { DeleteConfirmDialog } from "@/components/reports/DeleteConfirmDialog";
import { TimelineFilters } from "@/components/vault/TimelineFilters";
import { TimelineView } from "@/components/vault/TimelineView";
import { SmartAlerts } from "@/components/vault/SmartAlerts";
import { useNavigate } from "react-router-dom";
import { isWithinInterval, startOfDay, endOfDay, subDays, format } from "date-fns";

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
  
  const { reports, loading, deleteMultipleReports } = useReports();

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Search filter
      const matchesSearch = 
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.report_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.physician_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (report.facility_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      if (!matchesSearch) return false;

      // Date range filter
      if (dateRange.start || dateRange.end) {
        const reportDate = new Date(report.report_date);
        if (dateRange.start && dateRange.end) {
          if (!isWithinInterval(reportDate, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) })) {
            return false;
          }
        } else if (dateRange.start) {
          if (reportDate < startOfDay(dateRange.start)) return false;
        } else if (dateRange.end) {
          if (reportDate > endOfDay(dateRange.end)) return false;
        }
      }

      // Apply active filters
      const now = new Date();
      for (const filterId of activeFilters) {
        let filterMatched = false;

        // Check medical category filters
        const categoryFilterMatch = checkCategoryFilter(filterId, report);
        if (categoryFilterMatch !== null) {
          if (!categoryFilterMatch) return false;
          filterMatched = true;
        }

        // Check time-based filters
        if (!filterMatched) {
          const timeFilterMatch = checkTimeFilter(filterId, report, now);
          if (timeFilterMatch !== null) {
            if (!timeFilterMatch) return false;
            filterMatched = true;
          }
        }

        // Check special filters
        if (!filterMatched) {
          const specialFilterMatch = checkSpecialFilter(filterId, report);
          if (specialFilterMatch !== null) {
            if (!specialFilterMatch) return false;
            filterMatched = true;
          }
        }
      }

      return true;
    });
  }, [reports, searchQuery, activeFilters, dateRange]);

  const handleSelectReport = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedForDeletion(prev => [...prev, reportId]);
    } else {
      setSelectedForDeletion(prev => prev.filter(id => id !== reportId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedForDeletion(filteredReports.map(r => r.id));
    } else {
      setSelectedForDeletion([]);
    }
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


      {reports.length === 0 ? (
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
          {/* Smart Alerts */}
          <SmartAlerts 
            reports={reports} 
            onNavigateToUpload={() => navigate("/upload")}
          />

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search documents by title, type, physician, or facility..."
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

          {/* Filters, View Toggle, and Selection Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Smart Filters */}
            <TimelineFilters
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onClearAll={handleClearAllFilters}
            />

            {/* View Toggle and Selection Controls */}
            <div className="flex items-center gap-6">
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "timeline" | "grid")}>
                <TabsList>
                  <TabsTrigger value="timeline" className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Timeline View</span>
                  </TabsTrigger>
                  <TabsTrigger value="grid" className="flex items-center space-x-2">
                    <Grid className="h-4 w-4" />
                    <span>Grid View</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Selection Controls */}
              {filteredReports.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedForDeletion.length === filteredReports.length && filteredReports.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    Select All
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
              <TimelineView
                reports={filteredReports}
                selectedReports={selectedForDeletion}
                onSelectReport={handleSelectReport}
                onNavigateToReport={(reportId) => navigate(`/reports/${reportId}`)}
              />
            </TabsContent>

            <TabsContent value="grid" className="mt-6">
              <div className="grid gap-4">
                {filteredReports.map((report) => (
                  <Card 
                    key={report.id} 
                    className="cursor-pointer transition-all hover:shadow-md"
                    onClick={() => navigate(`/reports/${report.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Checkbox
                            checked={selectedForDeletion.includes(report.id)}
                            onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                            className="mt-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{report.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {report.report_type.replace('_', ' ')} • {format(new Date(report.report_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {filteredReports.length === 0 && (
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