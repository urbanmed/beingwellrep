import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Phone, Mail, Globe, Award } from "lucide-react";
import { Facility } from "@/types/medical-data";

interface EnhancedFacilityInfoCardProps {
  facility?: Facility;
}

export function EnhancedFacilityInfoCard({ facility }: EnhancedFacilityInfoCardProps) {
  if (!facility || Object.keys(facility).length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Facility Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {facility.name && (
          <div className="flex items-center gap-2">
            <div className="font-medium text-foreground">{facility.name}</div>
            {facility.department && (
              <Badge variant="secondary" className="text-xs">
                {facility.department}
              </Badge>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-3 text-sm">
          {facility.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Address:</span>
                <div className="font-medium">{facility.address}</div>
              </div>
            </div>
          )}
          
          {facility.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{facility.phone}</span>
            </div>
          )}
          
          {facility.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{facility.email}</span>
            </div>
          )}
          
          {facility.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Website:</span>
              <a 
                href={facility.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {facility.website}
              </a>
            </div>
          )}
        </div>
        
        {facility.accreditation && facility.accreditation.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Accreditation</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {facility.accreditation.map((accred, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {accred}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}