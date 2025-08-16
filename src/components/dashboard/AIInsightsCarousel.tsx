import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useSummaries } from "@/hooks/useSummaries";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { getContentPreview, getSeverityBadge } from "@/lib/utils/summary-parser";

export function AIInsightsCarousel() {
  const { summaries } = useSummaries();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const recentSummaries = summaries
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
    .slice(0, 3);

  const nextInsight = () => {
    setCurrentIndex((prev) => (prev + 1) % recentSummaries.length);
  };

  const prevInsight = () => {
    setCurrentIndex((prev) => (prev - 1 + recentSummaries.length) % recentSummaries.length);
  };

  if (recentSummaries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="medical-heading-sm flex items-center">
            <Brain className="h-4 w-4 mr-2 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="medical-annotation mb-3">No AI insights generated yet</p>
            <Button size="sm" onClick={() => navigate('/summaries')}>
              Generate Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentSummary = recentSummaries[currentIndex];
  const severityBadgeRaw = getSeverityBadge(currentSummary.content);
  const severityBadge = severityBadgeRaw ?? { variant: 'secondary' as const, label: 'Info' };
  const preview = getContentPreview(currentSummary.content, 120);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="h-4 w-4 mr-2 text-primary" />
            AI Insights
          </div>
          <div className="flex items-center space-x-2">
            {recentSummaries.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevInsight}
                  className="h-6 w-6 p-0"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="medical-annotation">
                  {currentIndex + 1}/{recentSummaries.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextInsight}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between mb-2">
          <h4 className="medical-label font-medium">{currentSummary.title}</h4>
          <Badge variant={severityBadge.variant} className="text-xs">
            {severityBadge.label}
          </Badge>
        </div>
        
        <p className="medical-annotation leading-relaxed">{preview}</p>
        
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs capitalize">
            {currentSummary.summary_type.replace(/_/g, ' ')}
          </Badge>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => navigate(`/summaries?id=${currentSummary.id}`)}
            className="text-xs"
          >
            View Insights
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}