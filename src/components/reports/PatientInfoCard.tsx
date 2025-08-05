import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface PatientInfoCardProps {
  patient: {
    name?: string;
    dateOfBirth?: string;
    id?: string;
    age?: string | number;
    gender?: string;
  };
}

export function PatientInfoCard({ patient }: PatientInfoCardProps) {
  if (!patient || (!patient.name && !patient.age && !patient.gender)) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-3">
        <h4 className="font-semibold mb-2 text-base">Patient Information</h4>
        <div className="flex flex-wrap items-center gap-4">
          {patient.name && (
            <div className="flex items-center gap-1">
              <Label className="text-muted-foreground text-xs">Name:</Label>
              <span className="font-medium text-sm">{patient.name}</span>
            </div>
          )}
          
          {patient.age && (
            <div className="flex items-center gap-1">
              <Label className="text-muted-foreground text-xs">Age:</Label>
              <span className="font-medium text-sm">{patient.age}</span>
            </div>
          )}
          
          {patient.gender && (
            <div className="flex items-center gap-1">
              <Label className="text-muted-foreground text-xs">Gender:</Label>
              <span className="font-medium text-sm capitalize">{patient.gender}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}