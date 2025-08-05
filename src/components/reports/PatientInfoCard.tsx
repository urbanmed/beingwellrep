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
  if (!patient || (!patient.name && !patient.dateOfBirth && !patient.id && !patient.age && !patient.gender)) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="font-semibold mb-4 text-lg">Patient Information</h4>
        <div className="space-y-3">
          {patient.name && (
            <div className="flex flex-col space-y-1">
              <Label className="text-muted-foreground">Name</Label>
              <span className="font-medium">{patient.name}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patient.dateOfBirth && (
              <div className="flex flex-col space-y-1">
                <Label className="text-muted-foreground">Date of Birth</Label>
                <span className="font-medium">{patient.dateOfBirth}</span>
              </div>
            )}
            
            {patient.age && (
              <div className="flex flex-col space-y-1">
                <Label className="text-muted-foreground">Age</Label>
                <span className="font-medium">{patient.age}</span>
              </div>
            )}
            
            {patient.id && (
              <div className="flex flex-col space-y-1">
                <Label className="text-muted-foreground">Patient ID</Label>
                <span className="font-medium">{patient.id}</span>
              </div>
            )}
            
            {patient.gender && (
              <div className="flex flex-col space-y-1">
                <Label className="text-muted-foreground">Gender</Label>
                <span className="font-medium capitalize">{patient.gender}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}