import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, User, FolderOpen } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export function RecentReportsVault() {
  const { reports } = useReports();
  const navigate = useNavigate();

  const recentReports = reports
    .filter(r => r.parsing_status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const getReportTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'lab': return 'default';
      case 'radiology': return 'warning';
      case 'prescription': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center justify-between">
          <div className="flex items-center">
            <FolderOpen className="h-4 w-4 mr-2 text-primary" />
            Recent Reports
          </div>
          <Badge variant="outline" className="text-xs">
            {reports.length} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentReports.length === 0 ? (
          <div className="text-center py-4">
            <p className="medical-annotation mb-3">No reports uploaded yet</p>
            <Button size="sm" onClick={() => navigate('/upload')}>
              Upload First Report
            </Button>
          </div>
        ) : (
          <>
            {recentReports.map((report) => (
              <div 
                key={report.id} 
                className="border rounded-lg p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="medical-label-xs font-medium truncate">
                      {report.title || 'Untitled Report'}
                    </span>
                  </div>
                  <Badge variant={getReportTypeColor(report.report_type)} className="text-xs">
                    {report.report_type}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-3">
                    {report.physician_name && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{report.physician_name}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(report.report_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={() => navigate('/vault')}
            >
              View All Reports
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}