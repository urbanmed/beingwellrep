import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  User, 
  Building, 
  MoreHorizontal,
  Eye,
  Download,
  Share2,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HealthTags } from "./HealthTags";
import { format } from "date-fns";

interface Report {
  id: string;
  title: string;
  report_type: string;
  report_date: string;
  physician_name?: string;
  facility_name?: string;
  is_critical?: boolean;
  parsing_confidence?: number;
  file_size?: number;
  tags?: string[];
}

interface ListViewProps {
  reports: Report[];
  selectedReports: string[];
  onSelectReport: (reportId: string, checked: boolean) => void;
  onNavigateToReport: (reportId: string) => void;
}

export function ListView({ reports, selectedReports, onSelectReport, onNavigateToReport }: ListViewProps) {
  const [hoveredReport, setHoveredReport] = useState<string | null>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (reports.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="medical-heading mb-2">No documents found</h3>
          <p className="medical-label">Try adjusting your filters or upload some documents.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium medical-label border-b">
        <div className="col-span-1"></div> {/* Checkbox */}
        <div className="col-span-4">Document</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-2">Provider</div>
        <div className="col-span-2">Tags</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Report Rows */}
      {reports.map((report) => (
        <Card 
          key={report.id} 
          className={`transition-all duration-200 cursor-pointer hover:shadow-md ${
            selectedReports.includes(report.id) ? 'ring-2 ring-primary/20 bg-primary/5' : ''
          } ${hoveredReport === report.id ? 'shadow-md' : ''}`}
          onMouseEnter={() => setHoveredReport(report.id)}
          onMouseLeave={() => setHoveredReport(null)}
        >
          <CardContent className="p-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Checkbox */}
              <div className="col-span-1">
                <Checkbox
                  checked={selectedReports.includes(report.id)}
                  onCheckedChange={(checked) => onSelectReport(report.id, checked as boolean)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Document Info */}
              <div className="col-span-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="medical-heading-sm truncate">{report.title}</h4>
                    <div className="flex items-center space-x-2 text-sm medical-label">
                      <span>{report.report_type.replace(/_/g, ' ')}</span>
                      {report.file_size && (
                        <>
                          <span>•</span>
                          <span>{formatFileSize(report.file_size)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="medical-label">
                    {format(new Date(report.report_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>

              {/* Provider Info */}
              <div className="col-span-2">
                <div className="space-y-1">
                  {report.physician_name && (
                    <div className="flex items-center space-x-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm medical-label truncate">{report.physician_name}</span>
                    </div>
                  )}
                  {report.facility_name && (
                    <div className="flex items-center space-x-2">
                      <Building className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm medical-label truncate">{report.facility_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="col-span-2">
                <HealthTags
                  reportType={report.report_type}
                  isCritical={report.is_critical}
                  confidence={report.parsing_confidence}
                  additionalTags={report.tags}
                />
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onNavigateToReport(report.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}