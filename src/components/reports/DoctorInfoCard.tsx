import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface DoctorInfoCardProps {
  facility?: string;
  orderingPhysician?: string;
  collectionDate?: string;
  reportDate?: string;
}

export function DoctorInfoCard({ 
  facility, 
  orderingPhysician, 
  collectionDate, 
  reportDate 
}: DoctorInfoCardProps) {
  // Only render if we have at least one piece of information
  if (!facility && !orderingPhysician && !collectionDate && !reportDate) {
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
        </div>
      </CardContent>
    </Card>
  );
}