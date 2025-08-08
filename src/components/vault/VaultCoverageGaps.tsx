import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";
import { useMemo } from "react";

interface Report {
  id: string;
  report_type: string;
}

interface VaultCoverageGapsProps {
  reports: Report[];
  onNavigateToUpload?: () => void;
}

const EXPECTED_TYPES = [
  'blood_test',
  'radiology',
  'cardiology',
  'genetic',
  'consultation',
  'pathology'
];

export function VaultCoverageGaps({ reports, onNavigateToUpload }: VaultCoverageGapsProps) {
  const { distribution, missing } = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach(r => counts.set(r.report_type, (counts.get(r.report_type) ?? 0) + 1));
    const dist = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const present = new Set(counts.keys());
    const missing = EXPECTED_TYPES.filter(t => !present.has(t));
    return { distribution: dist, missing };
  }, [reports]);

  return (
    <section aria-label="Coverage and gaps" className="h-full">
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Coverage & Gaps by Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-2">Top document types</div>
            <div className="flex flex-wrap gap-2">
              {distribution.map(([type, count]) => (
                <Badge key={type} variant="outline">{type} · {count}</Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Potential gaps</div>
            <div className="flex flex-wrap gap-2">
              {missing.length > 0 ? (
                missing.map(type => (
                  <Badge key={type} variant="secondary">{type}</Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No obvious gaps</span>
              )}
            </div>
          </div>
          {onNavigateToUpload && (
            <button onClick={onNavigateToUpload} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <PlusCircle className="h-4 w-4" /> Add documents
            </button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
