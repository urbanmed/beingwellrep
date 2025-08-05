import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pill, Clock, Calendar, Info, Route } from "lucide-react";
import { Medication } from "@/types/medical-data";

interface EnhancedMedicationCardProps {
  medications?: Medication[];
  title?: string;
}

function MedicationItem({ medication }: { medication: Medication }) {
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-semibold text-foreground text-lg">{medication.name}</div>
          {medication.genericName && (
            <div className="text-sm text-muted-foreground">
              Generic: {medication.genericName}
            </div>
          )}
        </div>
        
        {medication.form && (
          <Badge variant="outline" className="text-xs">
            {medication.form}
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {medication.dosage && (
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Dosage:</span>
            <span className="font-medium">{medication.dosage}</span>
          </div>
        )}
        
        {medication.strength && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Strength:</span>
            <span className="font-medium">{medication.strength}</span>
          </div>
        )}
        
        {medication.frequency && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Frequency:</span>
            <span className="font-medium">{medication.frequency}</span>
          </div>
        )}
        
        {medication.duration && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">{medication.duration}</span>
          </div>
        )}
        
        {medication.route && (
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Route:</span>
            <span className="font-medium">{medication.route}</span>
          </div>
        )}
        
        {medication.quantity && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Quantity:</span>
            <span className="font-medium">{medication.quantity}</span>
          </div>
        )}
        
        {medication.refills !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Refills:</span>
            <span className="font-medium">{medication.refills}</span>
          </div>
        )}
        
        {medication.indication && (
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Indication:</span>
            <span className="font-medium">{medication.indication}</span>
          </div>
        )}
      </div>
      
      {medication.instructions && (
        <div className="p-3 bg-muted/50 rounded-md">
          <div className="text-sm font-medium text-foreground mb-1">Instructions:</div>
          <div className="text-sm text-muted-foreground">{medication.instructions}</div>
        </div>
      )}
      
      {(medication.prescribedDate || medication.startDate || medication.endDate) && (
        <div className="border-t pt-3">
          <div className="text-sm font-medium text-foreground mb-2">Dates</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            {medication.prescribedDate && (
              <div>
                <span className="text-muted-foreground">Prescribed:</span>
                <div className="font-medium">
                  {new Date(medication.prescribedDate).toLocaleDateString()}
                </div>
              </div>
            )}
            {medication.startDate && (
              <div>
                <span className="text-muted-foreground">Start:</span>
                <div className="font-medium">
                  {new Date(medication.startDate).toLocaleDateString()}
                </div>
              </div>
            )}
            {medication.endDate && (
              <div>
                <span className="text-muted-foreground">End:</span>
                <div className="font-medium">
                  {new Date(medication.endDate).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EnhancedMedicationCard({ 
  medications, 
  title = "Medications" 
}: EnhancedMedicationCardProps) {
  if (!medications || medications.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Pill className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {medications.map((medication, index) => (
          <div key={index}>
            <MedicationItem medication={medication} />
            {index < medications.length - 1 && <Separator className="my-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}