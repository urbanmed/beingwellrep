import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Hash, Phone, Mail, MapPin } from "lucide-react";
import { Patient } from "@/types/medical-data";

interface EnhancedPatientInfoCardProps {
  patient?: Patient;
}

export function EnhancedPatientInfoCard({ patient }: EnhancedPatientInfoCardProps) {
  if (!patient || Object.keys(patient).length === 0) {
    return null;
  }

  const fullName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary" />
          Patient Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fullName && (
          <div className="flex items-center gap-2">
            <div className="font-medium text-foreground">{fullName}</div>
            {patient.gender && (
              <Badge variant="secondary" className="text-xs">
                {patient.gender}
              </Badge>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {patient.dateOfBirth && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">DOB:</span>
              <span className="font-medium">
                {new Date(patient.dateOfBirth).toLocaleDateString()}
              </span>
              {patient.age && (
                <span className="text-muted-foreground">({patient.age} years)</span>
              )}
            </div>
          )}
          
          {(patient.id || patient.mrn) && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {patient.mrn ? 'MRN:' : 'ID:'}
              </span>
              <span className="font-medium font-mono">
                {patient.mrn || patient.id}
              </span>
            </div>
          )}
          
          {patient.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{patient.phone}</span>
            </div>
          )}
          
          {patient.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{patient.email}</span>
            </div>
          )}
        </div>
        
        {patient.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-muted-foreground">Address:</span>
              <div className="font-medium">{patient.address}</div>
            </div>
          </div>
        )}
        
        {patient.insurance && (
          <div className="border-t pt-3">
            <div className="text-sm font-medium text-foreground mb-2">Insurance Information</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {patient.insurance.provider && (
                <div>
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-medium ml-2">{patient.insurance.provider}</span>
                </div>
              )}
              {patient.insurance.policyNumber && (
                <div>
                  <span className="text-muted-foreground">Policy:</span>
                  <span className="font-medium font-mono ml-2">{patient.insurance.policyNumber}</span>
                </div>
              )}
              {patient.insurance.groupNumber && (
                <div>
                  <span className="text-muted-foreground">Group:</span>
                  <span className="font-medium font-mono ml-2">{patient.insurance.groupNumber}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}