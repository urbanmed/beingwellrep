import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail } from "lucide-react";

interface DoctorInfoCardProps {
  facility?: string;
  orderingPhysician?: string;
  collectionDate?: string;
  reportDate?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export function DoctorInfoCard({ 
  facility, 
  orderingPhysician, 
  collectionDate, 
  reportDate,
  address,
  phone,
  email
}: DoctorInfoCardProps) {
  // Only render if we have at least one piece of information
  if (!facility && !orderingPhysician && !address && !phone && !email) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-3">
        <h4 className="medical-subheading mb-2">Medical Information</h4>
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {facility && (
              <div className="flex flex-col space-y-0.5">
                <Label className="medical-label-xs">Facility</Label>
                <span className="text-sm">{facility}</span>
              </div>
            )}
            
            {orderingPhysician && (
              <div className="flex flex-col space-y-0.5">
                <Label className="medical-label-xs">Ordering Physician</Label>
                <span className="text-sm">{orderingPhysician}</span>
              </div>
            )}
          </div>

          {/* Contact Information Section */}
          {(address || phone || email) && (
            <div className="mt-4">
              <h5 className="medical-label-xs mb-2">Contact Information</h5>
              <div className="space-y-2">
                {address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{address}</span>
                  </div>
                )}
                
                {phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{phone}</span>
                  </div>
                )}
                
                {email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{email}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}