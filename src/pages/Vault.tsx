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

      // Preset filters
      const now = new Date();
      for (const filterId of activeFilters) {
        switch (filterId) {
          case "blood-tests-year":
            if (report.report_type !== "blood_test" || 
                !isWithinInterval(new Date(report.report_date), { 
                  start: startOfDay(subDays(now, 365)), 
                  end: endOfDay(now) 
                })) return false;
            break;
          case "recent-prescriptions":
            if (report.report_type !== "prescription" || 
                !isWithinInterval(new Date(report.report_date), { 
                  start: startOfDay(subDays(now, 90)), 
                  end: endOfDay(now) 
                })) return false;
            break;
          case "imaging-year":
            if (report.report_type !== "radiology" || 
                !isWithinInterval(new Date(report.report_date), { 
                  start: startOfDay(subDays(now, 365)), 
                  end: endOfDay(now) 
                })) return false;
            break;
          case "critical-reports":
            if (!report.is_critical) return false;
            break;
          case "processing-errors":
            if (report.parsing_status !== "failed") return false;
            break;
          case "recent-month":
            if (!isWithinInterval(new Date(report.report_date), { 
              start: startOfDay(subDays(now, 30)), 
              end: endOfDay(now) 
            })) return false;
            break;
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

  const totalSize = reports.reduce((acc, report) => acc + (report.file_size || 0), 0);
  const completedReports = reports.filter(r => r.parsing_status === 'completed');
  const processingReports = reports.filter(r => r.parsing_status === 'processing');
  const failedReports = reports.filter(r => r.parsing_status === 'failed');
  const criticalReports = reports.filter(r => r.is_critical);

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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{reports.length}</div>
              <div className="text-sm text-muted-foreground">Total Documents</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{completedReports.length}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{processingReports.length}</div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{criticalReports.length}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {(totalSize / (1024 * 1024)).toFixed(1)} MB
              </div>
              <div className="text-sm text-muted-foreground">Storage Used</div>
            </div>
          </CardContent>
        </Card>
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

          {/* Smart Filters */}
          <TimelineFilters
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onClearAll={handleClearAllFilters}
          />

          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "timeline" | "grid")}>
            <div className="flex items-center justify-between">
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
                  <span>{filteredReports.length} document{filteredReports.length !== 1 ? 's' : ''}</span>
                  {selectedForDeletion.length > 0 && (
                    <span className="text-destructive">{selectedForDeletion.length} selected</span>
                  )}
                </div>
              )}
            </div>

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