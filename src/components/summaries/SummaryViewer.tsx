import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Star, 
  Download, 
  Share2, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Brain,
  Stethoscope,
  MessageSquare,
  Info
} from "lucide-react";
import { Summary } from "@/types/summary";
import { formatDistanceToNow, format } from "date-fns";
import { parseSummaryContent } from "@/lib/utils/summary-parser";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Report } from "@/hooks/useReports";
import { HighRiskTrendCharts, type MetricSeries } from "@/components/summaries/HighRiskTrendCharts";
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

  // Parse the content using the utility function
  const content: any = parseSummaryContent(summary.content);

  type MetricKey =
    | 'ldl'
    | 'hba1c'
    | 'glucose'
    | 'creatinine'
    | 'egfr'
    | 'triglycerides'
    | 'systolic_bp'
    | 'diastolic_bp'
    | 'heart_rate';

  const METRIC_DEFS: Record<MetricKey, { label: string; unit?: string; match: string[] }> = {
    ldl: { label: 'LDL Cholesterol', unit: 'mg/dL', match: ['ldl'] },
    hba1c: { label: 'HbA1c', unit: '%', match: ['hba1c', 'a1c', 'glycated hemoglobin'] },
    glucose: { label: 'Glucose', unit: 'mg/dL', match: ['glucose', 'fasting glucose'] },
    creatinine: { label: 'Creatinine', unit: 'mg/dL', match: ['creatinine'] },
    egfr: { label: 'eGFR', unit: 'mL/min', match: ['egfr', 'gfr'] },
    triglycerides: { label: 'Triglycerides', unit: 'mg/dL', match: ['triglyceride'] },
    systolic_bp: { label: 'Systolic BP', unit: 'mmHg', match: ['blood pressure', 'bp', 'systolic'] },
    diastolic_bp: { label: 'Diastolic BP', unit: 'mmHg', match: ['blood pressure', 'bp', 'diastolic'] },
    heart_rate: { label: 'Heart Rate', unit: 'bpm', match: ['heart rate', 'pulse'] },
  };

  const [sourceReports, setSourceReports] = useState<Report[]>([]);
  const [metricSeries, setMetricSeries] = useState<MetricSeries[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const getReportDate = (r: Report) => new Date(r.report_date || r.created_at);

  function parseNumber(input?: string | null): number | null {
    if (!input) return null;
    const numMatch = String(input).match(/-?\d+(?:\.\d+)?/);
    return numMatch ? parseFloat(numMatch[0]) : null;
  }

  function extractMetricKeysFromContent(c: any): MetricKey[] {
    const keys = new Set<MetricKey>();
    const addIfMatch = (text: string) => {
      const t = text.toLowerCase();
      (Object.keys(METRIC_DEFS) as MetricKey[]).forEach((k) => {
        if (METRIC_DEFS[k].match.some((m) => t.includes(m))) {
          // Special-case BP: add both systolic & diastolic when BP mentioned
          if (k === 'systolic_bp' || k === 'diastolic_bp') {
            keys.add('systolic_bp');
            keys.add('diastolic_bp');
          } else {
            keys.add(k);
          }
        }
      });
    };

    const candidates = [
      ...(c?.high_priority?.findings || []),
      ...(c?.high_priority?.trends || []),
      ...(c?.trends || []),
    ];

    candidates.forEach((item: any) => {
      const text = typeof item === 'string' ? item : item.text || item.finding || '';
      if (text) addIfMatch(text);
    });

    // Fallback defaults
    if (keys.size === 0) {
      ['ldl', 'hba1c', 'creatinine'].forEach((k) => keys.add(k as MetricKey));
    }

    // Limit to at most 5 keys before we later pick top 3 by data density
    return Array.from(keys).slice(0, 5);
  }

  function buildSeries(reports: Report[], keys: MetricKey[]): MetricSeries[] {
    const byKey: Record<MetricKey, MetricSeries> = {} as any;
    keys.forEach((k) => {
      byKey[k] = {
        key: k,
        label: METRIC_DEFS[k].label,
        unit: METRIC_DEFS[k].unit,
        points: [],
      };
    });

    const sorted = [...reports].sort((a, b) => getReportDate(a).getTime() - getReportDate(b).getTime());

    sorted.forEach((r) => {
      const date = getReportDate(r);
      const label = format(date, 'MMM d');
      const pd: any = r.parsed_data;
      if (!pd) return;

      // Lab tests
      if (pd.reportType === 'lab' && Array.isArray(pd.tests)) {
        pd.tests.forEach((t: any) => {
          const name = String(t.name || '').toLowerCase();
          const valueNum = parseNumber(t.value);
          if (valueNum == null) return;
          keys.forEach((k) => {
            if (k === 'systolic_bp' || k === 'diastolic_bp' || k === 'heart_rate') return;
            if (METRIC_DEFS[k].match.some((m) => name.includes(m))) {
              byKey[k].points.push({ date: date.toISOString(), label, value: valueNum });
            }
          });
        });
      }

      // Vitals
      if (pd.reportType === 'vitals' && Array.isArray(pd.vitals)) {
        pd.vitals.forEach((v: any) => {
          const type = String(v.type || '').toLowerCase();
          const val = String(v.value || '');
          if (type === 'blood_pressure') {
            const m = val.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
            if (m) {
              const sys = parseFloat(m[1]);
              const dia = parseFloat(m[2]);
              if (keys.includes('systolic_bp')) {
                byKey['systolic_bp'].points.push({ date: date.toISOString(), label, value: sys });
              }
              if (keys.includes('diastolic_bp')) {
                byKey['diastolic_bp'].points.push({ date: date.toISOString(), label, value: dia });
              }
            }
          }
          if (type === 'heart_rate') {
            const hr = parseNumber(val);
            if (hr != null && keys.includes('heart_rate')) {
              byKey['heart_rate'].points.push({ date: date.toISOString(), label, value: hr });
            }
          }
        });
      }
    });

    const series = Object.values(byKey).filter((s) => s.points.length > 0);
    return series;
  }

  useEffect(() => {
    if (!isOpen || summary.summary_type !== 'trend_analysis' || !Array.isArray(summary.source_report_ids) || summary.source_report_ids.length === 0) {
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoadingTrends(true);
        const { data, error } = await supabase
          .from('reports')
          .select('id, title, report_type, report_date, created_at, parsed_data')
          .in('id', summary.source_report_ids as string[])
          .order('report_date', { ascending: true });
        if (error) throw error;
        if (active) setSourceReports((data || []) as Report[]);
      } catch (e) {
        console.error('Failed to load source reports for trends', e);
      } finally {
        if (active) setLoadingTrends(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen, summary.id]);

  useEffect(() => {
    if (summary.summary_type !== 'trend_analysis') return;
    const keys = extractMetricKeysFromContent(content);
    const s = buildSeries(sourceReports, keys);
    const top = [...s].sort((a, b) => b.points.length - a.points.length).slice(0, 3);
    setMetricSeries(top);
  }, [content, sourceReports, summary.summary_type]);

  const renderHighRiskTrends = () => {
    if (!metricSeries.length) return null;
    return <HighRiskTrendCharts series={metricSeries} />;
  };

  const getSeverityColor = (level?: string) => {
    switch (level) {
      case 'high': return 'bg-destructive/10 border-destructive/20 text-destructive';
      case 'moderate': return 'bg-warning/10 border-warning/20 text-warning';
      case 'low': return 'bg-success/10 border-success/20 text-success';
      default: return 'bg-muted border-muted-foreground/20 text-muted-foreground';
    }
  };

  const riskLevelFromScore = (score?: number) => {
    if (typeof score !== 'number') return undefined;
    if (score >= 67) return 'high';
    if (score >= 34) return 'moderate';
    return 'low';
  };

  const riskBadgeVariant = (level?: string): 'destructive' | 'default' | 'secondary' => {
    switch (level) {
      case 'high':
        return 'destructive';
      case 'moderate':
        return 'default';
      case 'low':
      default:
        return 'secondary';
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
        <Card className="bg-success/10 border-success/20 text-success">
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

  const renderTrendAnalysis = () => {
    // Build quick highlights
    const metricHighlights = metricSeries.slice(0, 3).map((s) => {
      if (!s.points.length) return null;
      const first = s.points[0];
      const last = s.points[s.points.length - 1];
      const delta = last.value - first.value;
      const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '•';
      const unit = s.unit ? ` ${s.unit}` : '';
      return `${s.label}: ${first.value}${unit} → ${last.value}${unit} (${arrow}${Math.abs(Number(delta.toFixed(2)))})`;
    }).filter(Boolean) as string[];

    let textHighlights: string[] = [];
    const hp = content?.high_priority?.findings || content?.high_priority?.trends || [];
    if (Array.isArray(hp) && hp.length) {
      textHighlights = hp.slice(0, 2).map((item: any) => typeof item === 'string' ? item : (item.text || item.finding || ''));
    } else if (Array.isArray(content?.trends)) {
      const worsening = content.trends.filter((t: any) => t.trend === 'worsening');
      const rest = content.trends.filter((t: any) => t.trend !== 'worsening');
      textHighlights = [...worsening, ...rest].slice(0, 2).map((t: any) => `${t.parameter}: ${t.trend}`);
    }

    return (
      <div className="space-y-6">
        {(metricHighlights.length > 0 || textHighlights.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metricHighlights.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-foreground">
                    {metricHighlights.map((h, i) => (
                      <li key={`mh-${i}`}>{h}</li>
                    ))}
                  </ul>
                )}
                {textHighlights.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {textHighlights.map((h, i) => (
                      <li key={`th-${i}`}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {loadingTrends ? (
          <Card>
            <CardHeader>
              <CardTitle>High-risk trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Loading trends…</p>
            </CardContent>
          </Card>
        ) : (
          renderHighRiskTrends()
        )}

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
  };

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
            <Card key={idx} className="border-warning/30">
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

  const renderPrioritySection = (priority: 'high' | 'medium' | 'low', data: any, icon: React.ReactNode, colorClass: string) => {
    if (!data || (!data.findings?.length && !data.topics?.length && !data.trends?.length)) {
      return null;
    }

    const findings = data.findings || data.topics || data.trends || [];
    const recommendations = data.recommendations || data.questions || [];

    return (
      <div className={`border rounded-lg p-4 ${colorClass}`}>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className="font-semibold capitalize text-foreground">
            {priority} Priority
          </h4>
        </div>
        
        {findings.length > 0 && (
          <div className="space-y-2 mb-3">
            <h5 className="text-sm font-medium text-muted-foreground">
              {data.topics ? 'Topics:' : data.trends ? 'Trends:' : 'Findings:'}
            </h5>
            <ul className="space-y-1">
              {findings.map((item: any, index: number) => {
                const text = typeof item === 'string' ? item : (item.text || item.finding);
                const score: number | undefined = typeof item === 'string' ? undefined : item.risk_score;
                const level = riskLevelFromScore(score);
                return (
                  <li key={index} className="text-sm text-foreground flex items-center gap-2">
                    <span className="mr-2 text-primary">•</span>
                    <span className="flex-1">{text}</span>
                    {typeof score === 'number' && (
                      <Badge variant={riskBadgeVariant(level)} className="ml-2">
                        {item.category ? `${item.category}: ` : ''}{Math.round(score)}
                      </Badge>
                    )}
                  </li>
                );
              })}

            </ul>
          </div>
        )}
        
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-muted-foreground">
              {data.questions ? 'Questions:' : 'Recommendations:'}
            </h5>
            <ul className="space-y-1">
              {recommendations.map((item: string, index: number) => (
                <li key={index} className="text-sm text-foreground flex items-start">
                  <span className="mr-2 text-primary">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    // Check if content has priority structure
    const hasPriorityStructure = content.high_priority || content.medium_priority || content.low_priority;
    
    if (hasPriorityStructure) {
      return (
        <div className="space-y-6">
          {content.summary && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-foreground leading-relaxed">{content.summary}</p>
            </div>
          )}
          
          <div className="space-y-4">
            {renderPrioritySection(
              'high', 
              content.high_priority, 
              <AlertTriangle className="h-4 w-4 text-destructive" />,
              'border-destructive/50 bg-destructive/5'
            )}
            
            {renderPrioritySection(
              'medium', 
              content.medium_priority, 
              <Info className="h-4 w-4 text-primary" />,
              'border-primary/50 bg-primary/5'
            )}
            
            {renderPrioritySection(
              'low', 
              content.low_priority, 
              <CheckCircle className="h-4 w-4 text-green-600" />,
              'border-green-500/50 bg-green-50 dark:bg-green-900/10'
            )}
          </div>
        </div>
      );
    }
    
    // Fallback to original rendering for legacy content
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
              {content?.risk?.overall_score && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={riskBadgeVariant(content.risk.level || riskLevelFromScore(content.risk.overall_score))}>
                      Overall risk: {(content.risk.level || riskLevelFromScore(content.risk.overall_score))?.toString()} • {Math.round(content.risk.overall_score)} / 100
                    </Badge>
                  </div>
                  <Progress value={content.risk.overall_score} />
                  {Array.isArray(content.risk.category_breakdown) && content.risk.category_breakdown.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {content.risk.category_breakdown.slice(0,6).map((cat: any) => (
                        <Badge key={cat.category} variant="outline">
                          {cat.category}: {Math.round(cat.score)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

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