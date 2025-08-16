import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Brain, Sparkles } from "lucide-react";
import { useSummaries } from "@/hooks/useSummaries";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { getContentPreview, getSeverityBadge } from "@/lib/utils/summary-parser";

export function AIInsightsCarousel() {
  const { summaries } = useSummaries();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const recentSummaries = summaries
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
    .slice(0, 6);

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center">
          <Brain className="h-4 w-4 mr-2 text-primary" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-4">
            {recentSummaries.map((summary) => {
              const severityBadgeRaw = getSeverityBadge(summary.content);
              const severityBadge = severityBadgeRaw ?? { variant: 'secondary' as const, label: 'Info' };
              const preview = getContentPreview(summary.content, 120);
              
              return (
                <Card 
                  key={summary.id} 
                  className={`flex-none ${isMobile ? 'w-64' : 'w-80'}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="medical-label font-medium">{summary.title}</h4>
                      <Badge variant={severityBadge.variant} className="text-xs">
                        {severityBadge.label}
                      </Badge>
                    </div>
                    
                    <p className="medical-annotation leading-relaxed whitespace-normal">{preview}</p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs capitalize">
                        {summary.summary_type.replace(/_/g, ' ')}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => navigate(`/summaries?id=${summary.id}`)}
                        className="text-xs"
                      >
                        View Insights
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}