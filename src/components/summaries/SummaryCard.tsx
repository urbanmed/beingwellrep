import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Stethoscope,
  Star,
  Calendar,
  MoreVertical
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Summary } from "@/types/summary";

interface SummaryCardProps {
  summary: Summary;
  onView: (summary: Summary) => void;
  onPin?: (summaryId: string) => void;
}

const summaryTypeConfig = {
  comprehensive: {
    icon: Brain,
    label: "Comprehensive",
    color: "bg-blue-500",
    description: "Complete health overview"
  },
  abnormal_findings: {
    icon: AlertTriangle,
    label: "Abnormal Findings",
    color: "bg-orange-500",
    description: "Concerning findings identified"
  },
  trend_analysis: {
    icon: TrendingUp,
    label: "Trend Analysis",
    color: "bg-green-500",
    description: "Health trends over time"
  },
  doctor_prep: {
    icon: Stethoscope,
    label: "Doctor Prep",
    color: "bg-purple-500",
    description: "Questions for your doctor"
  }
};

export function SummaryCard({ summary, onView, onPin }: SummaryCardProps) {
  const config = summaryTypeConfig[summary.summary_type as keyof typeof summaryTypeConfig];
  const Icon = config?.icon || Brain;

  const getSeverityBadge = (content: any) => {
    if (!content) return null;
    
    const severity = content.severity_level || content.overall_concern_level;
    if (!severity) return null;

    const severityConfig = {
      low: { variant: "secondary" as const, label: "Low Priority" },
      moderate: { variant: "default" as const, label: "Moderate" },
      high: { variant: "destructive" as const, label: "High Priority" }
    };

    const severityInfo = severityConfig[severity as keyof typeof severityConfig];
    return severityInfo ? (
      <Badge variant={severityInfo.variant} className="text-xs">
        {severityInfo.label}
      </Badge>
    ) : null;
  };

  const getContentPreview = (content: any) => {
    if (typeof content === 'string') return content.slice(0, 150) + '...';
    
    if (content.summary) return content.summary.slice(0, 150) + '...';
    if (content.overall_health_trajectory) return `Health trajectory: ${content.overall_health_trajectory}`;
    if (content.abnormal_findings?.length > 0) return `${content.abnormal_findings.length} findings identified`;
    if (content.key_topics?.length > 0) return `${content.key_topics.length} topics to discuss`;
    
    return "AI-generated health summary";
  };

  let parsedContent;
  try {
    parsedContent = typeof summary.content === 'string' 
      ? JSON.parse(summary.content) 
      : summary.content;
  } catch (e) {
    parsedContent = summary.content;
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(summary)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config?.color || 'bg-gray-500'} bg-opacity-10`}>
              <Icon className="h-5 w-5" style={{ color: config?.color?.replace('bg-', '') || '#6b7280' }} />
            </div>
            <div>
              <CardTitle className="text-lg leading-tight">{summary.title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {config?.description || "AI-generated summary"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {summary.is_pinned && (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            )}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {getContentPreview(parsedContent)}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getSeverityBadge(parsedContent)}
            {summary.confidence_score && (
              <Badge variant="outline" className="text-xs">
                {Math.round(summary.confidence_score * 100)}% confidence
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true })}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Based on {summary.source_report_ids?.length || 0} report(s)
        </div>
      </CardContent>
    </Card>
  );
}