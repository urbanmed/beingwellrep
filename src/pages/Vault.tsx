import { useState } from "react";
import { Search, Filter, FileText, Calendar, AlertCircle, CheckCircle, Clock, Plus, Trash2, FolderOpen, Upload, Download, Eye, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useReports } from "@/hooks/useReports";
import { useFileDownload } from "@/hooks/useFileDownload";
import { ReportActions } from "@/components/reports/ReportActions";
import { DeleteConfirmDialog } from "@/components/reports/DeleteConfirmDialog";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function Vault() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  
  const { reports, loading, deleteMultipleReports } = useReports();
  const { downloadFile, isDownloading } = useFileDownload();

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.report_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.physician_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (report.facility_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesFilter = 
      activeFilter === "all" ||
      (activeFilter === "completed" && report.parsing_status === "completed") ||
      (activeFilter === "processing" && report.parsing_status === "processing") ||
      (activeFilter === "failed" && report.parsing_status === "failed") ||
      (activeFilter === "critical" && report.is_critical) ||
      (activeFilter === "recent" && new Date(report.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

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

  const getStatusIcon = (status: string) => {
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

  const getStatusBadge = (status: string, confidence: number | null) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            Ready {confidence && `(${Math.round(confidence * 100)}%)`}
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

  const getTypeColor = (type: string) => {
    const colors = {
      blood_test: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      radiology: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      prescription: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      discharge: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      general: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
    };
    return colors[type as keyof typeof colors] || colors.general;
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

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FolderOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Document Vault</h1>
            <p className="text-muted-foreground">Secure storage for all your medical documents</p>
          </div>
        </div>
        <Button onClick={() => navigate("/upload")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Documents
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              <div className="text-2xl font-bold text-green-600">{completedReports.length}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{processingReports.length}</div>
              <div className="text-sm text-muted-foreground">Processing</div>
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
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search documents..."
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

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
            >
              All ({reports.length})
            </Button>
            <Button
              variant={activeFilter === "recent" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("recent")}
            >
              Recent
            </Button>
            <Button
              variant={activeFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("completed")}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready ({completedReports.length})
            </Button>
            <Button
              variant={activeFilter === "processing" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("processing")}
            >
              <Clock className="h-3 w-3 mr-1" />
              Processing ({processingReports.length})
            </Button>
            <Button
              variant={activeFilter === "failed" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("failed")}
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Failed ({failedReports.length})
            </Button>
            <Button
              variant={activeFilter === "critical" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("critical")}
            >
              Critical
            </Button>
          </div>

          {/* Selection Controls */}
          {filteredReports.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-4">
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

          {/* Document List */}
          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <Card 
                key={report.id} 
                className="cursor-pointer transition-all hover:bg-accent/5 hover:shadow-md"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Checkbox
                        checked={selectedForDeletion.includes(report.id)}
                        onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="mt-1">
                        {getStatusIcon(report.parsing_status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{report.title}</h3>
                          <Badge className={getTypeColor(report.report_type)}>
                            {report.report_type.replace('_', ' ')}
                          </Badge>
                          {report.is_critical && (
                            <Badge variant="destructive" className="text-xs">
                              Critical
                            </Badge>
                          )}
                          {getStatusBadge(report.parsing_status, report.extraction_confidence)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(report.report_date), 'MMM d, yyyy')}
                          </div>
                          {report.physician_name && (
                            <div className="flex items-center">
                              <span className="text-xs">👨‍⚕️</span>
                              <span className="ml-1">{report.physician_name}</span>
                            </div>
                          )}
                          {report.facility_name && (
                            <div className="flex items-center">
                              <span className="text-xs">🏥</span>
                              <span className="ml-1">{report.facility_name}</span>
                            </div>
                          )}
                          {report.file_size && (
                            <div className="flex items-center">
                              <span className="text-xs">📊</span>
                              <span className="ml-1">{(report.file_size / 1024).toFixed(1)} KB</span>
                            </div>
                          )}
                        </div>
                        
                        {report.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
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
                          <div className="flex flex-wrap gap-1 mb-2">
                            {report.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/reports/${report.id}`);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {report.file_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(report.id, report.file_name, report.file_url);
                              }}
                              disabled={isDownloading(report.id)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              {isDownloading(report.id) ? "Downloading..." : "Download"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div onClick={(e) => e.stopPropagation()}>
                      <ReportActions
                        reportId={report.id}
                        ocrStatus={report.parsing_status}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredReports.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No documents found matching your search.</p>
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