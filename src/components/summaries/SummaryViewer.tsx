import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Star, 
  Download, 
  Share2, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Brain,
  Stethoscope,
  MessageSquare
} from "lucide-react";
import { Summary, SummaryContent } from "@/types/summary";
import { formatDistanceToNow } from "date-fns";

interface SummaryViewerProps {
  summary: Summary | null;
  isOpen: boolean;
  onClose: () => void;
  onPin?: (summaryId: string) => void;
  onRate?: (summaryId: string, rating: number) => void;
}

export function SummaryViewer({ 
  summary, 
  isOpen, 
  onClose, 
  onPin, 
  onRate 
}: SummaryViewerProps) {
  if (!summary) return null;

  let content: SummaryContent;
  try {
    content = typeof summary.content === 'string' 
      ? JSON.parse(summary.content) 
      : summary.content;
  } catch (e) {
    content = { summary: summary.content as string };
  }

  const getSeverityColor = (level?: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const renderComprehensiveSummary = () => (
    <div className="space-y-6">
      {content.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{content.summary}</p>
          </CardContent>
        </Card>
      )}

      {content.abnormal_findings && content.abnormal_findings.length > 0 && (
        <Card className={getSeverityColor(content.severity_level)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-inherit">
              <AlertTriangle className="h-5 w-5" />
              Abnormal Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.abnormal_findings.map((finding, idx) => (
                <li key={idx} className="text-sm">
                  • {typeof finding === 'string' ? finding : finding.finding}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.normal_findings && content.normal_findings.length > 0 && (
        <Card className="text-green-600 bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-inherit">
              <CheckCircle className="h-5 w-5" />
              Normal Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.normal_findings.map((finding, idx) => (
                <li key={idx} className="text-sm">• {finding}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.recommended_actions && content.recommended_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.recommended_actions.map((action, idx) => (
                <li key={idx} className="text-sm">• {action}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.doctor_questions && content.doctor_questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Questions for Your Doctor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.doctor_questions.map((question, idx) => (
                <li key={idx} className="text-sm">• {question}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTrendAnalysis = () => (
    <div className="space-y-6">
      {content.overall_health_trajectory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Health Trajectory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={
              content.overall_health_trajectory === 'improving' ? 'default' :
              content.overall_health_trajectory === 'stable' ? 'secondary' : 'destructive'
            }>
              {content.overall_health_trajectory.charAt(0).toUpperCase() + 
               content.overall_health_trajectory.slice(1)}
            </Badge>
          </CardContent>
        </Card>
      )}

      {content.trends && content.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Health Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {content.trends.map((trend, idx) => (
                <div key={idx} className="border-l-4 border-primary pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{trend.parameter}</span>
                    <Badge variant={
                      trend.trend === 'improving' ? 'default' :
                      trend.trend === 'stable' ? 'secondary' : 'destructive'
                    }>
                      {trend.trend}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{trend.details}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {content.key_insights && content.key_insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.key_insights.map((insight, idx) => (
                <li key={idx} className="text-sm">• {insight}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderDoctorPrep = () => (
    <div className="space-y-6">
      {content.key_topics && content.key_topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Key Topics to Discuss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {content.key_topics.map((topic, idx) => (
                <Badge key={idx} variant="outline">{topic}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {content.specific_questions && content.specific_questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Specific Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.specific_questions.map((question, idx) => (
                <li key={idx} className="text-sm">• {question}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.symptoms_to_mention && content.symptoms_to_mention.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Symptoms to Mention</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.symptoms_to_mention.map((symptom, idx) => (
                <li key={idx} className="text-sm">• {symptom}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.preparation_tips && content.preparation_tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preparation Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.preparation_tips.map((tip, idx) => (
                <li key={idx} className="text-sm">• {tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAbnormalFindings = () => (
    <div className="space-y-6">
      {content.overall_concern_level && (
        <Card className={getSeverityColor(content.overall_concern_level)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-inherit">
              <AlertTriangle className="h-5 w-5" />
              Overall Concern Level: {content.overall_concern_level.toUpperCase()}
            </CardTitle>
          </CardHeader>
          {content.immediate_action_needed && (
            <CardContent>
              <p className="text-sm font-medium">⚠️ Immediate medical attention may be needed</p>
            </CardContent>
          )}
        </Card>
      )}

      {content.abnormal_findings && content.abnormal_findings.length > 0 && (
        <div className="space-y-4">
          {content.abnormal_findings.map((finding, idx) => (
            <Card key={idx} className="border-orange-200">
              <CardContent className="pt-6">
                {typeof finding === 'string' ? (
                  <p className="text-sm">{finding}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{finding.finding}</h4>
                      <Badge variant={
                        finding.urgency === 'high' ? 'destructive' :
                        finding.urgency === 'moderate' ? 'default' : 'secondary'
                      }>
                        {finding.urgency} urgency
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{finding.explanation}</p>
                    <p className="text-sm"><strong>Significance:</strong> {finding.significance}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (summary.summary_type) {
      case 'comprehensive':
        return renderComprehensiveSummary();
      case 'trend_analysis':
        return renderTrendAnalysis();
      case 'doctor_prep':
        return renderDoctorPrep();
      case 'abnormal_findings':
        return renderAbnormalFindings();
      default:
        return <p className="text-sm">{content.summary || JSON.stringify(content, null, 2)}</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{summary.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Generated {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true })}
                {summary.confidence_score && (
                  <span> • {Math.round(summary.confidence_score * 100)}% confidence</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPin?.(summary.id)}
              >
                <Star className={`h-4 w-4 ${summary.is_pinned ? 'fill-current text-yellow-500' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          {renderContent()}
        </div>

        {summary.user_feedback && (
          <>
            <Separator />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Your Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{summary.user_feedback}</p>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}