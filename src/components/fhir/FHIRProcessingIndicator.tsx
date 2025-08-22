import { Loader2, Database, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FHIRProcessingIndicatorProps {
  isProcessing: boolean;
  fhirCreated?: boolean;
  className?: string;
}

export function FHIRProcessingIndicator({ 
  isProcessing, 
  fhirCreated = false, 
  className 
}: FHIRProcessingIndicatorProps) {
  if (!isProcessing && !fhirCreated) {
    return null;
  }

  return (
    <Badge 
      variant={isProcessing ? "default" : "secondary"} 
      className={cn(
        "flex items-center gap-1.5 text-xs",
        isProcessing && "animate-pulse",
        className
      )}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Creating FHIR Resources...
        </>
      ) : fhirCreated ? (
        <>
          <CheckCircle className="h-3 w-3 text-green-500" />
          FHIR Resources Created
        </>
      ) : (
        <>
          <Database className="h-3 w-3" />
          Structured Data Available
        </>
      )}
    </Badge>
  );
}