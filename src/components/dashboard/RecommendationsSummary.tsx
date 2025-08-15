import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CheckCircle } from "lucide-react";
import { useMemo, Fragment } from "react";
import { useSummaries } from "@/hooks/useSummaries";
import { useAuth } from "@/contexts/AuthContext";
import { parseSummaryContent } from "@/lib/utils/summary-parser";
import { extractActionItemsFromSummary } from "@/lib/utils/summary-to-dashboard";
import { useCompletedRecommendations } from "@/hooks/useCompletedRecommendations";

type Priority = 'high' | 'medium' | 'low';

interface RecItem {
  id: string;
  text: string;
  priority: Priority;
}

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function pickRecommendations(content: any): RecItem[] {
  const parsed = parseSummaryContent(content) || {};
  const result: RecItem[] = [];

  const buckets: { key: string; priority: Priority }[] = [
    { key: 'high_priority', priority: 'high' },
    { key: 'medium_priority', priority: 'medium' },
    { key: 'low_priority', priority: 'low' },
  ];

  const normalizeText = (it: any): string | null => {
    if (!it) return null;
    if (typeof it === 'string') return it.trim();
    return (it.text || it.finding || it.recommendation || it.action || '').toString().trim() || null;
  };

  for (const b of buckets) {
    const block = parsed?.[b.key] || {};
    const candidates: any[] = [];
    if (Array.isArray(block.recommendations)) candidates.push(...block.recommendations);
    if (Array.isArray(block.actions)) candidates.push(...block.actions);
    if (Array.isArray(block.recommended_actions)) candidates.push(...block.recommended_actions);

    for (let i = 0; i < candidates.length; i++) {
      const text = normalizeText(candidates[i]);
      if (!text) continue;
      const id = `${b.priority}-${i}-${slugify(text)}`;
      result.push({ id, text, priority: b.priority });
    }
  }

  // Fallback: use root-level recommended_actions if present
  if (result.length === 0 && Array.isArray((parsed as any).recommended_actions)) {
    const recs: any[] = (parsed as any).recommended_actions;
    for (let i = 0; i < recs.length; i++) {
      const text = normalizeText(recs[i]);
      if (!text) continue;
      result.push({ id: `rec-${i}-${slugify(text)}`, text, priority: 'medium' });
    }
  }

  // Fallback: derive from findings/action items
  if (result.length === 0) {
    const ai = extractActionItemsFromSummary(content);
    for (let i = 0; i < ai.length; i++) {
      const item = ai[i];
      const text = item.value ? `${item.testName} (${item.value})` : item.testName;
      const priority: Priority = item.severity === 'critical' ? 'high' : item.severity === 'warning' ? 'medium' : 'low';
      result.push({ id: `ai-${i}-${slugify(text)}`, text, priority });
    }
  }

  // Order by priority and limit top 6
  const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  result.sort((a, b) => order[a.priority] - order[b.priority]);
  return result.slice(0, 6);
}

function badgeVariant(p: Priority): "destructive" | "outline" {
  switch (p) {
    case 'high':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function RecommendationsSummary() {
  const { summaries, loading } = useSummaries();
  const { user } = useAuth();

  const latest = useMemo(() => {
    const comprehensive = summaries.filter(s => s.summary_type === 'comprehensive');
    if (comprehensive.length === 0) return null;
    // summaries are fetched ordered desc; but sort defensively
    comprehensive.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
    return comprehensive[0];
  }, [summaries]);

  const items = useMemo(() => (latest ? pickRecommendations(latest.content) : []), [latest]);
  const { isCompleted, toggleCompleted } = useCompletedRecommendations(user?.id, latest?.id);
  const firstNonHighIdx = useMemo(() => items.findIndex(i => i.priority !== 'high'), [items]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="medical-heading-sm flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-primary" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="medical-annotation text-center py-4">Loading recommendations...</p>
        </CardContent>
      </Card>
    );
  }

  if (!latest || items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="medical-heading-sm flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-primary" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="medical-annotation text-center py-4">No current recommendations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 text-primary" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 sm:space-y-3">
        {items.map((it, idx) => {
          const completed = isCompleted(it.id);
          const showSeparator = idx === firstNonHighIdx && firstNonHighIdx > 0;
          const isNonHigh = it.priority !== 'high';
          return (
            <Fragment key={it.id}>
              {showSeparator && <Separator className="my-2 bg-accent" />}
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Checkbox 
                    id={it.id} 
                    checked={completed} 
                    onCheckedChange={() => toggleCompleted(it.id)}
                    className="flex-shrink-0"
                  />
                  <label
                    htmlFor={it.id}
                    className={`text-xs sm:text-sm font-medium truncate cursor-pointer ${completed ? 'line-through text-muted-foreground' : ''}`}
                    title={it.text}
                  >
                    {it.text}
                  </label>
                </div>
                <Badge variant={badgeVariant(it.priority)} className={`text-[10px] sm:text-xs flex-shrink-0 ${isNonHigh ? 'bg-muted text-foreground border-transparent' : ''}`}>
                  {it.priority}
                </Badge>
              </div>
            </Fragment>
          );
        })}
      </CardContent>
    </Card>
  );
}
