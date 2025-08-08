import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestTube } from "lucide-react";
import { useMemo } from "react";
import { useReports } from "@/hooks/useReports";

type TestStatus = "normal" | "high" | "low" | "critical" | "abnormal" | "unknown";

interface TestResultItem {
  name: string;
  value: string;
  unit?: string;
  status: TestStatus;
  date: string;
}

function normalizeStatus(status?: string | null): TestStatus {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s.includes("critical")) return "critical";
  if (s.includes("high") || s.includes("elevated") || s.includes("abnormal")) return "abnormal";
  if (s.includes("low") || s.includes("decreased")) return "low";
  if (s.includes("normal")) return "normal";
  return "unknown";
}

function statusSeverity(status: TestStatus): number {
  switch (status) {
    case "critical":
      return 4;
    case "high":
    case "low":
    case "abnormal":
      return 3;
    case "unknown":
      return 2;
    default:
      return 1; // normal
  }
}

function statusToBadgeVariant(status: TestStatus): "destructive" | "warning" | "success" | "secondary" {
  switch (status) {
    case "critical":
      return "destructive";
    case "high":
    case "low":
    case "abnormal":
      return "warning";
    case "normal":
      return "success";
    default:
      return "secondary";
  }
}

export function LatestTestResultsSummary() {
  const { reports } = useReports();

  const latestTests = useMemo(() => {
    const items: TestResultItem[] = [];

    const recentCompleted = reports
      .filter((r) => r.parsing_status === "completed" && r.parsed_data)
      .slice(0, 15);

    for (const report of recentCompleted) {
      try {
        const data = typeof report.parsed_data === "string" ? JSON.parse(report.parsed_data) : report.parsed_data;

        // Prefer explicit lab tests when available
        const maybeTests: any[] | undefined = data?.tests;
        if (Array.isArray(maybeTests)) {
          maybeTests.forEach((t) => {
            if (!t?.name || !t?.value) return;
            const status = normalizeStatus(t.status);
            items.push({
              name: String(t.name),
              value: String(t.value),
              unit: t.unit ? String(t.unit) : undefined,
              status,
              date: report.report_date || report.created_at,
            });

            // Handle nested sub-tests if present
            if (Array.isArray(t.subTests)) {
              t.subTests.forEach((st: any) => {
                if (!st?.name || !st?.value) return;
                items.push({
                  name: String(st.name),
                  value: String(st.value),
                  unit: st.unit ? String(st.unit) : undefined,
                  status: normalizeStatus(st.status || t.status),
                  date: report.report_date || report.created_at,
                });
              });
            }
          });
        }

        // Fallback: if reportType is lab and data has vitals-like shape, ignore; we only want lab tests
      } catch (e) {
        // ignore parse errors for this report
        continue;
      }
    }

    // Deduplicate by test name (case-insensitive), keep latest by date; if same date, keep higher severity
    const byName = new Map<string, TestResultItem>();
    for (const it of items) {
      const key = it.name.trim().toLowerCase();
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, it);
        continue;
      }
      const existingDate = new Date(existing.date).getTime();
      const currentDate = new Date(it.date).getTime();
      if (currentDate > existingDate) {
        byName.set(key, it);
      } else if (currentDate === existingDate && statusSeverity(it.status) > statusSeverity(existing.status)) {
        byName.set(key, it);
      }
    }

    const deduped = Array.from(byName.values());
    deduped.sort((a, b) => {
      const sevDiff = statusSeverity(b.status) - statusSeverity(a.status);
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return deduped.slice(0, 6);
  }, [reports]);

  if (latestTests.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="medical-heading-sm flex items-center">
            <TestTube className="h-4 w-4 mr-2 text-primary" />
            Latest Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="medical-annotation text-center py-4">No recent lab test results found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center">
          <TestTube className="h-4 w-4 mr-2 text-primary" />
          Latest Test Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestTests.map((t, idx) => (
          <div key={`${t.name}-${idx}`} className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="medical-label-xs truncate" title={t.name}>{t.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="medical-annotation font-medium">
                {t.value}
                {t.unit ? ` ${t.unit}` : ""}
              </span>
              <Badge variant={statusToBadgeVariant(t.status)} className="text-xs capitalize">
                {t.status}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
