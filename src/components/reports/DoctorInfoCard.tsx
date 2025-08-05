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
  if (!facility && !orderingPhysician && !collectionDate && !reportDate && !address && !phone && !email) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="font-semibold mb-4 text-lg">Medical Information</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facility && (
              <div className="flex flex-col space-y-1">
                <Label className="text-muted-foreground">Facility</Label>
                <span className="font-medium">{facility}</span>
              </div>
            )}
            
            {orderingPhysician && (
              <div className="flex flex-col space-y-1">
                <Label className="text-muted-foreground">Ordering Physician</Label>
                <span className="font-medium">{orderingPhysician}</span>
              </div>
            )}
            
            {collectionDate && (
              <div className="flex flex-col space-y-1">
                <Label className="text-muted-foreground">Collection Date</Label>
                <span className="font-medium">
                  {new Date(collectionDate).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {reportDate && (
              <div className="flex flex-col space-y-1">
                <Label className="text-muted-foreground">Report Date</Label>
                <span className="font-medium">
                  {new Date(reportDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Contact Information Section */}
          {(address || phone || email) && (
            <div className="mt-6">
              <h5 className="font-medium mb-3 text-sm text-muted-foreground">Contact Information</h5>
              <div className="space-y-3">
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