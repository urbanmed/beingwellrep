import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  
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
    ldl: { label: 'LDL Cholesterol', unit: 'mg/dL', match: ['ldl', 'ldl-c', 'ldl cholesterol'] },
    hba1c: { label: 'HbA1c', unit: '%', match: ['hba1c', 'hb a1c', 'a1c', 'glycated hemoglobin', 'glycosylated hemoglobin'] },
    glucose: { label: 'Glucose', unit: 'mg/dL', match: ['glucose', 'fasting glucose', 'fpg', 'fbs', 'fasting blood sugar', 'plasma glucose'] },
    creatinine: { label: 'Creatinine', unit: 'mg/dL', match: ['creatinine', 'serum creatinine'] },
    egfr: { label: 'eGFR', unit: 'mL/min', match: ['egfr', 'gfr', 'estimated gfr', 'estimated glomerular filtration'] },
    triglycerides: { label: 'Triglycerides', unit: 'mg/dL', match: ['triglyceride', 'triglycerides', 'tg'] },
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

    const pushPoint = (k: MetricKey, date: Date, label: string, value: number) => {
      if (!Number.isFinite(value)) return;
      byKey[k].points.push({ date: date.toISOString(), label, value });
    };

    const nameMatchesKey = (name: string, key: MetricKey) =>
      METRIC_DEFS[key].match.some((m) => name.includes(m));

    sorted.forEach((r) => {
      const date = getReportDate(r);
      const label = format(date, 'MMM d');

      // parsed_data can be string or object
      let pd: any = r.parsed_data;
      if (typeof pd === 'string') {
        try { pd = JSON.parse(pd); } catch { /* ignore parse errors */ }
      }

      const type = (pd?.reportType || r.report_type || pd?.type || '').toString().toLowerCase();

      // ---------- Collect LAB-like data from various shapes ----------
      const labArrays: any[][] = [];
      if (Array.isArray(pd?.tests)) labArrays.push(pd.tests);
      if (Array.isArray(pd?.lab_tests)) labArrays.push(pd.lab_tests);
      if (Array.isArray(pd?.results)) labArrays.push(pd.results);
      if (Array.isArray(pd?.extractedData?.labTestResults)) labArrays.push(pd.extractedData.labTestResults);
      if (Array.isArray(pd?.structured?.lab?.tests)) labArrays.push(pd.structured.lab.tests);

      if (type.includes('lab') || labArrays.length) {
        labArrays.forEach((arr) => {
          arr.forEach((t: any) => {
            const rawName = String(t.name || t.test || t.testName || t.parameter || '').toLowerCase();
            const rawVal = t.value ?? t.result ?? t.measured_value ?? t.measuredValue ?? t.reading ?? t.latestValue ?? t.current ?? t.observed;
            const valueNum = typeof rawVal === 'number' ? rawVal : parseNumber(String(rawVal ?? ''));
            if (valueNum == null) return;
            (keys as MetricKey[]).forEach((k) => {
              if (k === 'systolic_bp' || k === 'diastolic_bp' || k === 'heart_rate') return;
              if (nameMatchesKey(rawName, k)) pushPoint(k, date, label, valueNum);
            });
          });
        });
      }

      // ---------- Collect VITALS from various shapes ----------
      const vitalsCandidate = pd?.vitals || pd?.extractedData?.vitals || pd?.structured?.vitals;
      const vitalsArr = Array.isArray(vitalsCandidate)
        ? vitalsCandidate
        : vitalsCandidate && typeof vitalsCandidate === 'object'
          ? Object.entries(vitalsCandidate).map(([k, v]) => ({ type: k, value: v }))
          : [];

      if (type.includes('vital') || vitalsArr.length) {
        vitalsArr.forEach((v: any) => {
          const typeName = String(v.type || v.name || '').toLowerCase();
          const valStr = String(v.value ?? v.reading ?? '');
          if (typeName.includes('blood_pressure') || /\bbp\b|blood\s*pressure/.test(typeName)) {
            const m = valStr.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
            if (m) {
              const sys = parseFloat(m[1]);
              const dia = parseFloat(m[2]);
              if (keys.includes('systolic_bp')) pushPoint('systolic_bp', date, label, sys);
              if (keys.includes('diastolic_bp')) pushPoint('diastolic_bp', date, label, dia);
            }
          } else if (typeName.includes('heart_rate') || /heart\s*rate|\bpulse\b/.test(typeName)) {
            const hr = parseNumber(valStr);
            if (hr != null && keys.includes('heart_rate')) pushPoint('heart_rate', date, label, hr);
          } else {
            const vn = parseNumber(valStr);
            if (vn != null) {
              (Object.keys(METRIC_DEFS) as MetricKey[]).forEach((k) => {
                if (k === 'systolic_bp' || k === 'diastolic_bp' || k === 'heart_rate') return;
                if (nameMatchesKey(typeName, k)) pushPoint(k, date, label, vn);
              });
            }
          }
        });
      }

      // ---------- Parse GENERAL sections text for known metrics ----------
      const sectionTexts: string[] = [];
      if (Array.isArray(pd?.sections)) {
        pd.sections.forEach((s: any) => {
          if (s?.content) sectionTexts.push(String(s.content));
        });
      } else if (typeof pd?.narrative === 'string') {
        sectionTexts.push(pd.narrative);
      }

      if (sectionTexts.length) {
        const fullText = sectionTexts.join('\n').toLowerCase();
        (keys as MetricKey[]).forEach((k) => {
          // If we don't yet have points for this key at this date, try to extract a nearby number
          if (byKey[k].points.find((p) => p.date === date.toISOString())) return;
          const matched = METRIC_DEFS[k].match.some((m) => fullText.includes(m));
          if (!matched) return;
          const num = parseNumber(fullText);
          if (num != null) pushPoint(k, date, label, num);
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
    <div className="space-y-4">
      {content.summary && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-xs leading-relaxed">{content.summary}</p>
          </CardContent>
        </Card>
      )}

      {content.abnormal_findings && content.abnormal_findings.length > 0 && (
        <Card className={getSeverityColor(content.severity_level)}>
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading flex items-center gap-2 text-inherit">
              <AlertTriangle className="h-4 w-4" />
              Abnormal Findings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ul className="space-y-1">
              {content.abnormal_findings.map((finding, idx) => (
                 <li key={idx} className="text-xs">
                   • {typeof finding === 'string' ? finding : finding.finding}
                 </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.normal_findings && content.normal_findings.length > 0 && (
        <Card className="bg-success/10 border-success/20 text-success">
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading flex items-center gap-2 text-inherit">
              <CheckCircle className="h-4 w-4" />
              Normal Findings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ul className="space-y-1">
              {content.normal_findings.map((finding, idx) => (
                <li key={idx} className="text-xs">• {finding}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.recommended_actions && content.recommended_actions.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading">Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ul className="space-y-1">
              {content.recommended_actions.map((action, idx) => (
                <li key={idx} className="text-xs">• {action}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.doctor_questions && content.doctor_questions.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Questions for Your Doctor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ul className="space-y-1">
              {content.doctor_questions.map((question, idx) => (
                 <li key={idx} className="text-xs">• {question}</li>
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
      <div className="space-y-4">
        {(metricHighlights.length > 0 || textHighlights.length > 0) && (
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="medical-subheading">Highlights</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
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
            <CardHeader className="p-3">
              <CardTitle className="medical-subheading">High-risk trends</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-sm text-muted-foreground">Loading trends…</p>
            </CardContent>
          </Card>
        ) : metricSeries.length > 0 ? (
          renderHighRiskTrends()
        ) : (
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="medical-subheading">High-risk trends</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-sm text-muted-foreground">No trendable data found from the selected reports.</p>
            </CardContent>
          </Card>
        )}

        {content.overall_health_trajectory && (
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="medical-subheading flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Overall Health Trajectory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <Badge variant={
                content.overall_health_trajectory === 'improving' ? 'default' :
                content.overall_health_trajectory === 'stable' ? 'secondary' : 'destructive'
              } className="text-xs">
                {content.overall_health_trajectory.charAt(0).toUpperCase() + 
                 content.overall_health_trajectory.slice(1)}
              </Badge>
            </CardContent>
          </Card>
        )}

        {content.trends && content.trends.length > 0 && (
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="medical-subheading">Health Trends</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-3">
                {content.trends.map((trend, idx) => (
                  <div key={idx} className="border-l-4 border-primary pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="medical-label-xs font-medium">{trend.parameter}</span>
                      <Badge variant={
                        trend.trend === 'improving' ? 'default' :
                        trend.trend === 'stable' ? 'secondary' : 'destructive'
                      } className="text-xs">
                        {trend.trend}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{trend.details}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {content.key_insights && content.key_insights.length > 0 && (
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="medical-subheading">Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ul className="space-y-1">
                {content.key_insights.map((insight, idx) => (
                  <li key={idx} className="text-xs">• {insight}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderDoctorPrep = () => (
    <div className="space-y-4">
      {content.key_topics && content.key_topics.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Key Topics to Discuss
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-2">
              {content.key_topics.map((topic, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">{topic}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {content.specific_questions && content.specific_questions.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading">Specific Questions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ul className="space-y-1">
              {content.specific_questions.map((question, idx) => (
                <li key={idx} className="text-xs">• {question}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.symptoms_to_mention && content.symptoms_to_mention.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading">Symptoms to Mention</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ul className="space-y-1">
              {content.symptoms_to_mention.map((symptom, idx) => (
                <li key={idx} className="text-xs">• {symptom}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {content.preparation_tips && content.preparation_tips.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading">Preparation Tips</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ul className="space-y-1">
              {content.preparation_tips.map((tip, idx) => (
                <li key={idx} className="text-xs">• {tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAbnormalFindings = () => (
    <div className="space-y-4">
      {content.overall_concern_level && (
        <Card className={getSeverityColor(content.overall_concern_level)}>
          <CardHeader className="p-3">
            <CardTitle className="medical-subheading flex items-center gap-2 text-inherit">
              <AlertTriangle className="h-4 w-4" />
              Overall Concern Level: {content.overall_concern_level.toUpperCase()}
            </CardTitle>
          </CardHeader>
          {content.immediate_action_needed && (
            <CardContent className="p-3 pt-0">
              <p className="text-sm font-medium">⚠️ Immediate medical attention may be needed</p>
            </CardContent>
          )}
        </Card>
      )}

      {content.abnormal_findings && content.abnormal_findings.length > 0 && (
        <div className="space-y-3">
          {content.abnormal_findings.map((finding, idx) => (
            <Card key={idx} className="border-warning/30">
              <CardContent className="p-3">
                {typeof finding === 'string' ? (
                  <p className="text-xs">{finding}</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="medical-label-xs font-medium">{finding.finding}</h4>
                      <div className="flex gap-1">
                        {finding.urgency && (
                          <Badge variant={
                            finding.urgency === 'high' ? 'destructive' :
                            finding.urgency === 'moderate' ? 'default' : 'secondary'
                          } className="text-xs">
                            {finding.urgency} urgency
                          </Badge>
                        )}
                        {finding.significance && (
                          <Badge variant="secondary" className="text-xs">
                            {finding.significance}
                          </Badge>
                        )}
                      </div>
                    </div>
                     <p className="text-xs text-muted-foreground">{finding.explanation}</p>
                     <p className="text-xs"><strong>Significance:</strong> {finding.significance}</p>
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
    if (!data || (!data.findings?.length && !data.topics?.length && !data.trends?.length && !data.recommendations?.length && !data.questions?.length)) {
      return null;
    }

    const findings = data.findings || data.topics || data.trends || [];
    const recommendations = data.recommendations || data.questions || [];

    return (
      <div className={`border rounded-lg p-3 ${colorClass}`}>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h4 className="medical-subheading capitalize text-foreground">
            {priority} Priority
          </h4>
        </div>
        
        {findings.length > 0 && (
          <div className="space-y-2 mb-2">
            <h5 className="medical-label-xs font-medium text-muted-foreground">
              {data.topics ? 'Topics:' : data.trends ? 'Trends:' : 'Findings:'}
            </h5>
            <ul className="space-y-1">
              {findings.map((item: any, index: number) => {
                const text = typeof item === 'string' ? item : (item.text || item.finding);
                const score: number | undefined = typeof item === 'string' ? undefined : item.risk_score;
                const level = riskLevelFromScore(score);
                return (
                  <li key={index} className="text-xs text-foreground flex items-center gap-2">
                    <span className="mr-2 text-primary">•</span>
                    <span className="flex-1">{text}</span>
                    {typeof score === 'number' && (
                      <Badge variant={riskBadgeVariant(level)} className="ml-2 text-xs">
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
            <h5 className="medical-label-xs font-medium text-muted-foreground">
              {data.questions ? 'Questions:' : 'Recommendations:'}
            </h5>
            <ul className="space-y-1">
              {recommendations.map((item: string, index: number) => (
                <li key={index} className="text-xs text-foreground flex items-start">
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
        <div className="space-y-4">
          {summary.summary_type === 'trend_analysis' && renderTrendAnalysis()}
          {content.summary && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-foreground leading-relaxed">{content.summary}</p>
            </div>
          )}
          
          <div className="space-y-3">
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
        return <p className="text-xs">{content.summary || JSON.stringify(content, null, 2)}</p>;
    }
  };

  const headerContent = (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <h2 className="medical-heading-sm">{summary.title}</h2>
        <div className="flex items-center gap-3 medical-label-xs">
          <span>Generated {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true })}</span>
          {summary.confidence_score && (
            <div className="flex items-center gap-1">
              <span>Confidence:</span>
              <Badge variant="outline" className="text-xs">{summary.confidence_score}%</Badge>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onPin && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onPin(summary.id)}
            className="h-8"
          >
            <Star className={`h-3 w-3 ${summary.is_pinned ? 'fill-current text-yellow-500' : ''}`} />
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm"
          className="h-8"
        >
          <Share2 className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8"
        >
          <Download className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  const contentElement = (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {renderContent()}
      </div>

      {summary.user_feedback && (
        <div className="border-t p-3 flex-shrink-0">
          <h4 className="medical-label-xs font-medium mb-1">Your Feedback</h4>
          <p className="text-sm text-muted-foreground">"{summary.user_feedback}"</p>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="border-b p-4 space-y-3">
            <DrawerTitle asChild>
              <div>{headerContent}</div>
            </DrawerTitle>
          </DrawerHeader>
          {contentElement}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="border-b p-3 space-y-3 flex-shrink-0">
          <DialogTitle asChild>
            <div>{headerContent}</div>
          </DialogTitle>
        </DialogHeader>
        {contentElement}
      </DialogContent>
    </Dialog>
  );
}
