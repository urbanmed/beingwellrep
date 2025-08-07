import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config?.color || 'bg-gray-500'} bg-opacity-10`}>
              <Icon className="h-5 w-5" style={{ color: config?.color?.replace('bg-', '') || '#6b7280' }} />
            </div>
            <div>
              <CardTitle className="font-semibold leading-tight">{summary.title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {config?.description || "AI-generated summary"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {summary.is_pinned && (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild data-dropdown-trigger>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
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
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {getContentPreview(parsedContent)}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {severityBadgeInfo && (
              <Badge variant={severityBadgeInfo.variant} className="text-xs">
                {severityBadgeInfo.label}
              </Badge>
            )}
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