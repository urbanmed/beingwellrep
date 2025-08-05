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
      <CardContent className="p-4">
        <h4 className="font-semibold mb-3 text-lg">Patient Information</h4>
        <div className="flex flex-wrap items-center gap-6">
          {patient.name && (
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Name:</Label>
              <span className="font-medium">{patient.name}</span>
            </div>
          )}
          
          {patient.age && (
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Age:</Label>
              <span className="font-medium">{patient.age}</span>
            </div>
          )}
          
          {patient.gender && (
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Gender:</Label>
              <span className="font-medium capitalize">{patient.gender}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}