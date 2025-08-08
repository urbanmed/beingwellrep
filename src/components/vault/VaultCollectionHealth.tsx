import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, FileText, Tag, AlertTriangle, CalendarClock } from "lucide-react";
import { useMemo } from "react";

interface Report {
  id: string;
  report_type: string;
  report_date?: string | null;
  parsing_status?: string | null;
  is_critical?: boolean | null;
  tags?: string[] | null;
  created_at?: string;
}

interface VaultCollectionHealthProps {
  reports: Report[];
}

export function VaultCollectionHealth({ reports }: VaultCollectionHealthProps) {
  const stats = useMemo(() => {
    const total = reports.length;
    const processed = reports.filter(r => r.parsing_status === 'completed').length;
    const failed = reports.filter(r => r.parsing_status === 'failed').length;
    const critical = reports.filter(r => r.is_critical).length;
    const withTags = reports.filter(r => (r.tags?.length ?? 0) > 0).length;
    const types = new Set(reports.map(r => r.report_type));

    const lastUpdate = reports
      .map(r => r.created_at ? new Date(r.created_at).getTime() : 0)
      .filter(Boolean)
      .sort((a, b) => b - a)[0];

    return {
      total,
      processedPct: total ? Math.round((processed / total) * 100) : 0,
      failed,
      critical,
      tagCoveragePct: total ? Math.round((withTags / total) * 100) : 0,
      uniqueTypes: types.size,
      lastUpdate
    };
  }, [reports]);

  return (
    <section aria-label="Vault collection health" className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Documents</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total uploaded</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Completed</span>
            <span className="text-xs font-medium">{stats.processedPct}%</span>
          </div>
          <Progress value={stats.processedPct} className="h-2" />
          {stats.failed > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs text-destructive">{stats.failed} failed</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tag Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Tagged</span>
            </div>
            <span className="text-xs font-medium">{stats.tagCoveragePct}%</span>
          </div>
          <Progress value={stats.tagCoveragePct} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <Badge variant={stats.critical > 0 ? "destructive" : "secondary"}>
              {stats.critical} critical
            </Badge>
          </div>
          {stats.lastUpdate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Updated {new Date(stats.lastUpdate).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
