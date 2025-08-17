import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Stethoscope,
  Star,
  Calendar,
  MoreVertical,
  Pin,
  PinOff,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Summary } from "@/types/summary";
import { parseSummaryContent, getContentPreview, getSeverityBadge } from "@/lib/utils/summary-parser";

interface SummaryCardProps {
  summary: Summary;
  onView: (summary: Summary) => void;
  onPin?: (summaryId: string) => void;
  onDelete?: (summaryId: string) => void;
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

export function SummaryCard({ summary, onView, onPin, onDelete }: SummaryCardProps) {
  const config = summaryTypeConfig[summary.summary_type as keyof typeof summaryTypeConfig];
  const Icon = config?.icon || Brain;

  // Parse the content using the utility function
  const parsedContent = parseSummaryContent(summary.content);

  // Get severity badge using the utility function
  const severityBadgeInfo = getSeverityBadge(parsedContent);

  // Risk scoring (new)
  const riskScore: number | undefined = parsedContent?.risk?.overall_score;
  const riskLevel: 'low' | 'moderate' | 'high' | undefined = parsedContent?.risk?.level ||
    (typeof riskScore === 'number'
      ? (riskScore >= 67 ? 'high' : riskScore >= 34 ? 'moderate' : 'low')
      : undefined);
  const riskVariant = riskLevel === 'high' ? 'destructive' : riskLevel === 'moderate' ? 'default' : 'secondary';

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onView if clicking on the dropdown menu
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return;
    }
    onView(summary);
  };

  const handleDropdownAction = (action: 'pin' | 'delete', e: React.MouseEvent) => {
    e.stopPropagation();
    if (action === 'pin' && onPin) {
      onPin(summary.id);
    } else if (action === 'delete' && onDelete) {
      onDelete(summary.id);
    }
  };

  return (
    <Card className="group cursor-pointer hover:shadow-sm" onClick={handleCardClick}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${config?.color || 'bg-muted'} bg-opacity-10`}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Top row: title, description, actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium leading-tight truncate">{summary.title}</CardTitle>
                  {summary.is_pinned && (
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                  )}
                </div>
                <CardDescription className="text-xs mt-0.5">
                  {config?.description || "AI-generated summary"}
                </CardDescription>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild data-dropdown-trigger>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background">
                    <DropdownMenuItem onClick={(e) => handleDropdownAction('pin', e)}>
                      {summary.is_pinned ? (
                        <>
                          <PinOff className="h-4 w-4 mr-2" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4 mr-2" />
                          Pin
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleDropdownAction('delete', e)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Preview */}
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {getContentPreview(parsedContent)}
            </p>

            {/* Meta row */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {typeof riskScore === 'number' && (
                  <Badge variant={riskVariant as any} className="h-5 px-1.5 text-[10px]">
                    Risk: {riskLevel?.toUpperCase()} • {Math.round(riskScore)}/100
                  </Badge>
                )}
                {severityBadgeInfo && (
                  <Badge variant={severityBadgeInfo.variant} className="h-5 px-1.5 text-[10px]">
                    {severityBadgeInfo.label}
                  </Badge>
                )}
                {summary.confidence_score && (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {Math.round(summary.confidence_score * 100)}% confidence
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true })}
              </div>
            </div>

            <div className="mt-1 text-[11px] text-muted-foreground">
              Based on {summary.source_report_ids?.length || 0} report(s)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}