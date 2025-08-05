import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, User, Stethoscope } from "lucide-react";

interface ReportHeaderProps {
  report: {
    id: string;
    title: string;
    report_type: string;
    parsing_status: string;
    extraction_confidence: number | null;
    parsing_confidence: number | null;
    physician_name: string | null;
    facility_name: string | null;
    report_date: string;
  };
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl mb-2">{report.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {report.report_type.replace('_', ' ')}
              </Badge>
              <Badge variant={getStatusColor(report.parsing_status)}>
                {report.parsing_status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.facility_name && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Facility</p>
                <p className="text-sm text-muted-foreground">{report.facility_name}</p>
              </div>
            </div>
          )}
          
          {report.physician_name && (
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Physician</p>
                <p className="text-sm text-muted-foreground">{report.physician_name}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Report Date</p>
              <p className="text-sm text-muted-foreground">{formatDate(report.report_date)}</p>
            </div>
          </div>
          
          {(report.extraction_confidence || report.parsing_confidence) && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Processing Confidence</p>
                <p className="text-sm text-muted-foreground">
                  {report.parsing_confidence ? `${Math.round(report.parsing_confidence * 100)}%` : 
                   report.extraction_confidence ? `${Math.round(report.extraction_confidence * 100)}%` : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}