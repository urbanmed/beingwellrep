import { format } from "date-fns";
import { Pill, Eye, Calendar, User, Building2, FileText, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { usePrescriptions, type Prescription } from "@/hooks/usePrescriptions";

interface PrescriptionCardProps {
  prescription: Prescription;
}

export function PrescriptionCard({ prescription }: PrescriptionCardProps) {
  const navigate = useNavigate();
  const { updatePrescriptionStatus } = usePrescriptions();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'discontinued':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await updatePrescriptionStatus(prescription.id, newStatus);
  };

  const handleViewReport = () => {
    navigate(`/reports/${prescription.report_id}`);
  };

  const handleViewSourceReport = () => {
    if (prescription.source_report_id) {
      navigate(`/reports/${prescription.source_report_id}`);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Pill className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{prescription.medication_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(prescription.status)}>
                  {prescription.status}
                </Badge>
                {prescription.family_member && (
                  <Badge variant="outline" className="text-xs">
                    {prescription.family_member.first_name} {prescription.family_member.last_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewReport}>
                <Eye className="h-4 w-4 mr-2" />
                View Prescription Document
              </DropdownMenuItem>
              
              {prescription.source_report && (
                <DropdownMenuItem onClick={handleViewSourceReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Source Report
                </DropdownMenuItem>
              )}
              
              {prescription.status !== 'active' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  Mark as Active
                </DropdownMenuItem>
              )}
              
              {prescription.status !== 'completed' && (
                <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                  Mark as Completed
                </DropdownMenuItem>
              )}
              
              {prescription.status !== 'discontinued' && (
                <DropdownMenuItem onClick={() => handleStatusChange('discontinued')}>
                  Mark as Discontinued
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Medication Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {prescription.dosage && (
            <div>
              <span className="text-muted-foreground">Dosage:</span>
              <p className="font-medium">{prescription.dosage}</p>
            </div>
          )}
          
          {prescription.frequency && (
            <div>
              <span className="text-muted-foreground">Frequency:</span>
              <p className="font-medium">{prescription.frequency}</p>
            </div>
          )}
          
          {prescription.duration && (
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <p className="font-medium">{prescription.duration}</p>
            </div>
          )}

          {(prescription.start_date || prescription.end_date) && (
            <div>
              <span className="text-muted-foreground">Treatment Period:</span>
              <p className="font-medium">
                {prescription.start_date && format(new Date(prescription.start_date), 'MMM d, yyyy')}
                {prescription.start_date && prescription.end_date && ' - '}
                {prescription.end_date && format(new Date(prescription.end_date), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* Provider Details */}
        <div className="space-y-2 text-sm">
          {prescription.prescribing_doctor && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Prescribed by:</span>
              <span className="font-medium">{prescription.prescribing_doctor}</span>
            </div>
          )}
          
          {prescription.pharmacy && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pharmacy:</span>
              <span className="font-medium">{prescription.pharmacy}</span>
            </div>
          )}
        </div>

        {/* Source Report */}
        {prescription.source_report && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Based on:</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary hover:underline"
                onClick={handleViewSourceReport}
              >
                {prescription.source_report.title}
              </Button>
            </div>
          </div>
        )}

        {/* Notes */}
        {prescription.notes && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <span className="text-sm text-muted-foreground">Notes:</span>
            <p className="text-sm mt-1">{prescription.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Added {format(new Date(prescription.created_at), 'MMM d, yyyy')}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewReport}
            className="h-7 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            View Document
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}