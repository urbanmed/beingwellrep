import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Brain, 
  Bone, 
  Eye, 
  Pill, 
  Activity, 
  Stethoscope,
  TestTube,
  Scissors,
  Shield
} from "lucide-react";

interface HealthTagsProps {
  reportType: string;
  isCritical?: boolean;
  confidence?: number;
  additionalTags?: string[];
}

const getReportTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'lab_results':
    case 'blood_test':
      return TestTube;
    case 'radiology':
      return Eye;
    case 'prescription':
      return Pill;
    case 'consultation':
      return Stethoscope;
    case 'procedure':
      return Scissors;
    case 'vaccination':
      return Shield;
    case 'cardiology':
      return Heart;
    case 'neurology':
      return Brain;
    case 'orthopedic':
      return Bone;
    default:
      return Activity;
  }
};

const getReportTypeColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'lab_results':
    case 'blood_test':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'radiology':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'prescription':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'consultation':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'procedure':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'vaccination':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'cardiology':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'neurology':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'orthopedic':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatReportType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function HealthTags({ reportType, isCritical, confidence, additionalTags = [] }: HealthTagsProps) {
  const IconComponent = getReportTypeIcon(reportType);
  const colorClass = getReportTypeColor(reportType);

  return (
    <div className="flex flex-wrap gap-2">
      {/* Main Report Type Tag */}
      <Badge 
        variant="outline" 
        className={`${colorClass} flex items-center gap-1 px-2 py-1`}
      >
        <IconComponent className="h-3 w-3" />
        {formatReportType(reportType)}
      </Badge>

      {/* Critical Tag */}
      {isCritical && (
        <Badge variant="destructive" className="flex items-center gap-1 px-2 py-1">
          <Activity className="h-3 w-3" />
          Critical
        </Badge>
      )}

      {/* Confidence Tag */}
      {confidence !== undefined && confidence > 0 && (
        <Badge 
          variant={confidence >= 80 ? "default" : confidence >= 60 ? "secondary" : "outline"} 
          className="px-2 py-1"
        >
          {Math.round(confidence)}% Confidence
        </Badge>
      )}

      {/* Additional Tags */}
      {additionalTags.map((tag, index) => (
        <Badge key={index} variant="outline" className="px-2 py-1 bg-muted">
          {tag}
        </Badge>
      ))}
    </div>
  );
}