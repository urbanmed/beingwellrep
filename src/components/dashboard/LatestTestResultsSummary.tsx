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
  const s = String(status).toLowerCase();
  if (s.includes("critical")) return "critical";
  if (s.includes("high") || s.includes("elevated")) return "high";
  if (s.includes("low") || s.includes("decreased")) return "low";
  if (s.includes("abnormal")) return "abnormal";
  if (s.includes("normal")) return "normal";
  return "unknown";
}

function normalizeDate(input?: string | null): string {
  if (!input) return new Date().toISOString();
  const trimmed = String(input).trim();

  // Handle DD-MM-YYYY explicitly -> YYYY-MM-DDT00:00:00Z
  const ddMmYyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
  const m = trimmed.match(ddMmYyyy);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}T00:00:00Z`;
  }

  // If parseable, normalize to ISO
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString();

  return trimmed;
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

function extractTestsFromData(data: any, date: string): TestResultItem[] {
  const results: TestResultItem[] = [];

  const processOne = (t: any) => {
    if (!t) return;
    const hasName = t.name != null && String(t.name).trim() !== "";
    const hasValue = t.value != null && String(t.value).trim() !== "";
    if (!hasValue) return;
    results.push({
      name: hasName ? String(t.name) : "Unnamed Test",
      value: String(t.value),
      unit: t.unit ? String(t.unit) : undefined,
      status: normalizeStatus(t.status),
      date,
    });
    if (Array.isArray(t.subTests)) {
      t.subTests.forEach((st: any) => {
        if (!st || st.value == null) return;
        results.push({
          name: st.name ? String(st.name) : (hasName ? `${String(t.name)} - Subtest` : "Subtest"),
          value: String(st.value),
          unit: st.unit ? String(st.unit) : undefined,
          status: normalizeStatus(st.status || t.status),
          date,
        });
      });
    }
  };

  const processArray = (arr: any[]) => {
    arr.forEach(processOne);
  };

  const processDict = (obj: Record<string, any>) => {
    Object.entries(obj).forEach(([key, v]) => {
      if (v && typeof v === "object") {
        if ("value" in v) {
          results.push({
            name: String(key),
            value: String((v as any).value),
            unit: (v as any).unit ? String((v as any).unit) : undefined,
            status: normalizeStatus((v as any).status),
            date,
          });
        } else if (Array.isArray(v)) {
          processArray(v);
        } else if (v && typeof v === "object") {
          // nested object might still be a test row with name/value
          processOne({ name: key, ...(v as any) });
        }
      }
    });
  };

  if (Array.isArray(data?.tests)) {
    processArray(data.tests);
  } else if (data?.tests && typeof data.tests === "object") {
    processDict(data.tests);
  }

  const sections = data?.sections;
  if (Array.isArray(sections)) {
    sections.forEach((sec: any) => {
      if (!sec) return;
      if (Array.isArray(sec.tests)) {
        processArray(sec.tests);
      }
      if (Array.isArray(sec.items)) {
        processArray(sec.items);
      }
      if (sec.data) {
        if (Array.isArray(sec.data)) processArray(sec.data);
        else if (typeof sec.data === "object") processDict(sec.data);
      }
      if (typeof sec === "object") {
        Object.values(sec).forEach((val: any) => {
          if (Array.isArray(val)) processArray(val);
          else if (val && typeof val === "object" && ("value" in val || "name" in val)) {
            processOne(val);
          }
        });
      }
    });
  } else if (sections && typeof sections === "object") {
    processDict(sections as Record<string, any>);
  }

  return results.filter((r) => r.name && r.name !== "Unnamed Test");
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
        const date = normalizeDate(report.report_date || report.created_at);
        const extracted = extractTestsFromData(data, date);
        items.push(...extracted);

        // Fallbacks intentionally omitted: only lab-like test structures are gathered
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
