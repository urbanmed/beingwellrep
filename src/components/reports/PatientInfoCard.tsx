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
        <h4 className="medical-subheading mb-2">Patient Information</h4>
        <div className="flex flex-wrap items-center gap-4">
          {patient.name && (
            <div className="flex items-center gap-1">
              <Label className="medical-label-xs">Name:</Label>
              <span className="text-sm">{patient.name}</span>
            </div>
          )}
          
          {patient.age && (
            <div className="flex items-center gap-1">
              <Label className="medical-label-xs">Age:</Label>
              <span className="text-sm">{patient.age}</span>
            </div>
          )}
          
          {patient.gender && (
            <div className="flex items-center gap-1">
              <Label className="medical-label-xs">Gender:</Label>
              <span className="text-sm capitalize">{patient.gender}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}