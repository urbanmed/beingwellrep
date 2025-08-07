import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Trash2,
  Clock
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
  description?: string;
  created_at: string;
}

interface CardViewProps {
  reports: Report[];
  selectedReports: string[];
  onSelectReport: (reportId: string, checked: boolean) => void;
  onNavigateToReport: (reportId: string) => void;
}

export function CardView({ reports, selectedReports, onSelectReport, onNavigateToReport }: CardViewProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {reports.map((report) => (
        <Card 
          key={report.id} 
          className={`transition-all duration-200 cursor-pointer hover:shadow-lg medical-card-hover ${
            selectedReports.includes(report.id) ? 'ring-2 ring-primary/20 bg-primary/5' : ''
          } ${hoveredReport === report.id ? 'shadow-lg scale-105' : ''}`}
          onMouseEnter={() => setHoveredReport(report.id)}
          onMouseLeave={() => setHoveredReport(null)}
          onClick={() => onNavigateToReport(report.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="medical-heading-sm truncate" title={report.title}>
                    {report.title}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs medical-label mt-1">
                    <Clock className="h-3 w-3" />
                    <span>Added {format(new Date(report.created_at), 'MMM dd')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Checkbox
                  checked={selectedReports.includes(report.id)}
                  onCheckedChange={(checked) => onSelectReport(report.id, checked as boolean)}
                  onClick={(e) => e.stopPropagation()}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
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
          </CardHeader>

          <CardContent className="pt-0 space-y-4">
            {/* Date and Provider Info */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm medical-label">
                  {format(new Date(report.report_date), 'MMM dd, yyyy')}
                </span>
              </div>
              
              {report.physician_name && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm medical-label truncate" title={report.physician_name}>
                    {report.physician_name}
                  </span>
                </div>
              )}
              
              {report.facility_name && (
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm medical-label truncate" title={report.facility_name}>
                    {report.facility_name}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {report.description && (
              <p className="text-sm medical-label line-clamp-2" title={report.description}>
                {report.description}
              </p>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <HealthTags
                reportType={report.report_type}
                isCritical={report.is_critical}
                confidence={report.parsing_confidence}
                additionalTags={report.tags?.slice(0, 2)} // Limit tags in card view
              />
            </div>

            {/* File Size */}
            {report.file_size && (
              <div className="text-xs medical-label">
                {formatFileSize(report.file_size)}
              </div>
            )}

            {/* Action Button */}
            <Button 
              size="sm" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToReport(report.id);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}