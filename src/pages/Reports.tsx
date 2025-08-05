import { useState } from "react";
import { Search, Filter, FileText, Calendar, AlertCircle, CheckCircle, Clock, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useReports } from "@/hooks/useReports";
import { ReportActions } from "@/components/reports/ReportActions";
import { DeleteConfirmDialog } from "@/components/reports/DeleteConfirmDialog";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function Reports() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { reports, loading, deleteMultipleReports, fetchReports } = useReports();

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.report_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.physician_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesFilter = 
      activeFilter === "all" ||
      (activeFilter === "completed" && report.parsing_status === "completed") ||
      (activeFilter === "processing" && report.parsing_status === "processing") ||
      (activeFilter === "failed" && report.parsing_status === "failed") ||
      (activeFilter === "critical" && report.is_critical);

    return matchesSearch && matchesFilter;
  });

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

  const getOCRStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getOCRStatusBadge = (status: string, confidence: number | null) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            Processed {confidence && `(${Math.round(confidence * 100)}%)`}
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Medical Reports</h1>
          <p className="text-muted-foreground">Manage your uploaded medical documents</p>
        </div>
        <Button onClick={() => navigate("/upload")}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No Reports Yet</CardTitle>
            <CardDescription className="mb-6 max-w-md mx-auto">
              Upload your first medical report to get started with AI-powered insights and analysis.
            </CardDescription>
            <Button onClick={() => navigate("/upload")}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Your First Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search reports..."
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
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={activeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("all")}
              >
                All ({reports.length})
              </Button>
              <Button
                variant={activeFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("completed")}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Processed ({reports.filter(r => r.parsing_status === 'completed').length})
              </Button>
              <Button
                variant={activeFilter === "processing" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("processing")}
              >
                <Clock className="h-3 w-3 mr-1" />
                Processing ({reports.filter(r => r.parsing_status === 'processing').length})
              </Button>
              <Button
                variant={activeFilter === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("failed")}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Failed ({reports.filter(r => r.parsing_status === 'failed').length})
              </Button>
            </div>
          </div>

          {filteredReports.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedForDeletion.length === filteredReports.length && filteredReports.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                Select All
              </label>
              <span>{filteredReports.length} result{filteredReports.length !== 1 ? 's' : ''}</span>
              {selectedForDeletion.length > 0 && (
                <span className="text-destructive">{selectedForDeletion.length} selected</span>
              )}
            </div>
          )}

          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Checkbox
                        checked={selectedForDeletion.includes(report.id)}
                        onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="mt-1">
                        {getOCRStatusIcon(report.parsing_status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{report.title}</h3>
                          {report.is_critical && (
                            <Badge variant="destructive" className="text-xs">
                              Critical
                            </Badge>
                          )}
                          {getOCRStatusBadge(report.parsing_status, report.extraction_confidence)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(report.report_date), 'MMM d, yyyy')}
                          </div>
                          <div className="capitalize">
                            {report.report_type.replace('_', ' ')}
                          </div>
                          {report.physician_name && (
                            <div>{report.physician_name}</div>
                          )}
                          {report.facility_name && (
                            <div>{report.facility_name}</div>
                          )}
                        </div>
                        
                        {report.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {report.description}
                          </p>
                        )}
                        
                        {report.processing_error && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-2">
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {report.processing_error}
                            </p>
                          </div>
                        )}
                        
                        {report.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {report.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <ReportActions
                      reportId={report.id}
                      ocrStatus={report.parsing_status}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredReports.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No reports found matching your search.</p>
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