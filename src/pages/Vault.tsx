
import { useState, useMemo } from "react";
import { Search, Clock, Trash2, FolderOpen, Upload, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReports } from "@/hooks/useReports";
import { DeleteConfirmDialog } from "@/components/reports/DeleteConfirmDialog";
import { ReportCategoriesFilter } from "@/components/vault/ReportCategoriesFilter";
import { ViewModeSelector, ViewMode } from "@/components/vault/ViewModeSelector";
import { ReportListView } from "@/components/vault/ReportListView";
import { ReportCardView } from "@/components/vault/ReportCardView";
import { ReportTimelineView } from "@/components/vault/ReportTimelineView";
import { DocumentProcessing } from "@/components/vault/DocumentProcessing";
import { FloatingUploadButton } from "@/components/vault/FloatingUploadButton";

import { TagsFilter } from "@/components/vault/TagsFilter";
import { ReportCompareDialog } from "@/components/vault/ReportCompareDialog";
import { VaultCollectionHealth } from "@/components/vault/VaultCollectionHealth";
import { VaultHygieneCard } from "@/components/vault/VaultHygieneCard";
import { VaultCoverageGaps } from "@/components/vault/VaultCoverageGaps";
import { VaultQuickFilters } from "@/components/vault/VaultQuickFilters";

import { useNavigate } from "react-router-dom";



// Health categories mapping for filtering
const HEALTH_CATEGORIES_MAP = {
  "blood-tests": ["blood_test", "lab_results"],
  "genetic-reports": ["genetic", "pathology"],
  "thyroid-hormone": ["lab_results", "endocrine"],
  "heart-cardiac": ["cardiology", "procedure"],
  "neurology": ["neurology", "radiology"],
  "nutrition-diet": ["nutrition", "consultation"],
  "microbiome-gut": ["microbiome", "lab_results"],
  "other-misc": ["general", "consultation", "discharge"]
};

// Helper function for category filtering
const checkCategoryFilter = (categoryId: string, report: any): boolean => {
  const reportTypes = HEALTH_CATEGORIES_MAP[categoryId as keyof typeof HEALTH_CATEGORIES_MAP];
  return reportTypes ? reportTypes.includes(report.report_type) : false;
};

export default function Vault() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"documents" | "processing">("documents");
  const [statusFilter, setStatusFilter] = useState<'critical' | 'processing_errors' | 'untagged' | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const { reports, loading, deleteMultipleReports, refetch } = useReports();

  // Tags
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => (r.tags || []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [reports]);
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Search filter
      const matchesSearch = 
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.report_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.physician_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (report.facility_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategories.length > 0) {
        const matchesCategory = selectedCategories.some(categoryId => 
          checkCategoryFilter(categoryId, report)
        );
        if (!matchesCategory) return false;
      }

      // Tags filter
      if (selectedTags.length > 0) {
        const tags = report.tags || [];
        const matchesTags = selectedTags.some(tag => tags.includes(tag));
        if (!matchesTags) return false;
      }

      // Status quick filter
      if (statusFilter === 'critical' && !report.is_critical) return false;
      if (statusFilter === 'processing_errors' && report.parsing_status !== 'failed') return false;
      if (statusFilter === 'untagged' && ((report.tags?.length ?? 0) > 0)) return false;

      return true;
    });
  }, [reports, searchQuery, selectedCategories, selectedTags, statusFilter]);

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
    setSelectedCategories([]);
    setSelectedTags([]);
    setSearchQuery("");
    setStatusFilter(null);
  };

  const handleFloatingUploadComplete = async () => {
    // Refresh the reports data when upload completes
    await refetch();
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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex items-center space-x-3">
          <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-lg sm:text-2xl font-semibold">Health Vault</h1>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "documents" | "processing")} className="mb-4 sm:mb-6">
        <TabsList className="grid w-full grid-cols-1 h-9 sm:h-10">
          <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4 sm:mt-6">
          {/* Overview Section */}
          {reports.length > 0 && (
            <div className="mb-4 sm:mb-6 space-y-4">
              <VaultCollectionHealth reports={reports} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VaultHygieneCard
                  reports={reports}
                  onQuickFilter={(f) => {
                    if (f === 'processing_errors') setStatusFilter('processing_errors');
                    if (f === 'untagged') setStatusFilter('untagged');
                  }}
                />
                <VaultCoverageGaps reports={reports} onNavigateToUpload={() => navigate('/upload')} />
              </div>
              <VaultQuickFilters
                active={statusFilter ?? 'all'}
                onApply={(f) => setStatusFilter(f === 'all' ? null : f)}
              />
              <DocumentProcessing />
            </div>
          )}

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
        <div className="space-y-4 sm:space-y-6">

          {/* Search and Filter Row */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 sm:h-10 text-sm placeholder:text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <ReportCategoriesFilter
                selectedCategories={selectedCategories}
                onCategoryChange={setSelectedCategories}
                onClearAll={handleClearAllFilters}
              />
              {selectedForDeletion.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-9 text-sm shrink-0"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete ({selectedForDeletion.length})</span>
                  <span className="sm:hidden">{selectedForDeletion.length}</span>
                </Button>
              )}
            </div>
          </div>

          {/* View Mode and Selection Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <ViewModeSelector
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {/* Selection Controls */}
            {filteredReports.length > 0 && (
              <div className="flex items-center justify-between sm:justify-end gap-3 text-sm text-muted-foreground">
                <label className="flex items-center gap-2 cursor-pointer touch-target min-h-[44px] sm:min-h-0">
                  <Checkbox
                    checked={selectedForDeletion.length === filteredReports.length && filteredReports.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Select All</span>
                </label>
                {selectedForDeletion.length > 0 && (
                  <span className="text-destructive text-sm font-medium">{selectedForDeletion.length} selected</span>
                )}
              </div>
            )}
          </div>

          {/* Content based on view mode */}
          <div className="mt-4 sm:mt-6">
            {viewMode === "list" && (
              <ReportListView
                reports={filteredReports}
                selectedReports={selectedForDeletion}
                onSelectReport={handleSelectReport}
                onNavigateToReport={(reportId) => navigate(`/reports/${reportId}`)}
              />
            )}
            
            {viewMode === "card" && (
              <ReportCardView
                reports={filteredReports}
                selectedReports={selectedForDeletion}
                onSelectReport={handleSelectReport}
                onNavigateToReport={(reportId) => navigate(`/reports/${reportId}`)}
              />
            )}
            
            {viewMode === "timeline" && (
              <ReportTimelineView
                reports={filteredReports}
                selectedReports={selectedForDeletion}
                onSelectReport={handleSelectReport}
                onNavigateToReport={(reportId) => navigate(`/reports/${reportId}`)}
                onNavigateToUpload={() => navigate("/upload")}
              />
            )}
          </div>

          {filteredReports.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No documents found matching your criteria.</p>
                <Button variant="outline" className="mt-4" onClick={handleClearAllFilters}>
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </TabsContent>


      </Tabs>
      
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        isMultiple={true}
        count={selectedForDeletion.length}
      />

      {/* Compare Dialog */}
      <ReportCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        reports={reports.filter(r => selectedForDeletion.includes(r.id)).slice(0, 2)}
      />

      {/* Floating Upload Button */}
      <FloatingUploadButton onUploadComplete={handleFloatingUploadComplete} />
    </div>
  );
}
