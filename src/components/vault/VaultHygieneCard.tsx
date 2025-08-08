import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Tag, Calendar, Bug } from "lucide-react";
import { useMemo } from "react";

interface Report {
  id: string;
  report_date?: string | null;
  parsing_status?: string | null;
  tags?: string[] | null;
}

interface VaultHygieneCardProps {
  reports: Report[];
  onQuickFilter?: (filter: 'processing_errors' | 'untagged') => void;
}

export function VaultHygieneCard({ reports, onQuickFilter }: VaultHygieneCardProps) {
  const hygiene = useMemo(() => {
    const failed = reports.filter(r => r.parsing_status === 'failed').length;
    const missingDate = reports.filter(r => !r.report_date).length;
    const untagged = reports.filter(r => (r.tags?.length ?? 0) === 0).length;
    return { failed, missingDate, untagged };
  }, [reports]);

  return (
    <section aria-label="Document hygiene" className="h-full">
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Document Hygiene & Integrity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-destructive" />
              <span className="text-sm">Processing errors</span>
            </div>
            <Badge onClick={() => onQuickFilter?.('processing_errors')} className="cursor-pointer" variant="secondary">
              {hygiene.failed}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm">Missing dates</span>
            </div>
            <Badge variant="secondary">{hygiene.missingDate}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-sm">Untagged documents</span>
            </div>
            <Badge onClick={() => onQuickFilter?.('untagged')} className="cursor-pointer" variant="secondary">
              {hygiene.untagged}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
