import { useState, useMemo } from "react";
import { Search, Clock, Plus, Trash2, FolderOpen, Upload, Filter } from "lucide-react";
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
import { VaultSummary } from "@/components/vault/VaultSummary";

import { useNavigate } from "react-router-dom";
import { isWithinInterval, startOfDay, endOfDay, subDays, format } from "date-fns";

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

      // Category filter
      if (selectedCategories.length > 0) {
        const matchesCategory = selectedCategories.some(categoryId => 
          checkCategoryFilter(categoryId, report)
        );
        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [reports, searchQuery, selectedCategories]);

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
          <h1 className="medical-title">Health Vault</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => navigate("/upload")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Documents
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "documents" | "processing")} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="processing">Processed documents</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          {/* Summary Section */}
          {reports.length > 0 && (
            <div className="mb-6">
              <VaultSummary />
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
        <div className="space-y-6">

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search documents by title, type, physician, or facility..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-xs placeholder:text-xs"
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

          {/* Report Categories Section */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Category Filter */}
            <ReportCategoriesFilter
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
              onClearAll={handleClearAllFilters}
            />

            {/* View Mode Selector and Selection Controls */}
            <div className="flex items-center gap-6">
              <ViewModeSelector
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />

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

          {/* Content based on view mode */}
          <div className="mt-6">
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

        <TabsContent value="processing" className="mt-6">
          <DocumentProcessing />
        </TabsContent>
      </Tabs>
      
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