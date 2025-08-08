import { parseSummaryContent } from "@/lib/utils/summary-parser";

export type VitalStatus = 'normal' | 'high' | 'low' | 'critical';

export interface AIVital {
  type: string;
  value: string;
  status: VitalStatus;
}

export interface AIActionItem {
  id: string;
  testName: string;
  value: string;
  status: 'critical' | 'high' | 'low' | 'abnormal';
  severity: 'critical' | 'warning' | 'info';
}

function detectVitalType(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('blood pressure') || t.includes('bp') || t.includes('systolic') || t.includes('diastolic')) return 'blood_pressure';
  if (t.includes('heart rate') || t.includes('pulse') || t.includes('bpm')) return 'heart_rate';
  if (t.includes('temperature') || t.includes('fever') || t.includes('temp')) return 'temperature';
  if (t.includes('respiratory rate') || t.includes('breathing')) return 'respiratory_rate';
  if (t.includes('oxygen') || t.includes('spo2')) return 'oxygen_saturation';
  if (t.includes('weight')) return 'weight';
  if (t.includes('height')) return 'height';
  if (t.includes('bmi')) return 'bmi';
  return null;
}

function inferStatusFromText(text: string, fallback: VitalStatus = 'normal'): VitalStatus {
  const t = text.toLowerCase();
  if (t.includes('critical')) return 'critical';
  if (t.includes('high') || t.includes('elevated')) return 'high';
  if (t.includes('low') || t.includes('decreased')) return 'low';
  return fallback;
}

function extractPrimaryValueSegment(text: string): string | null {
  // Try to capture content inside first parentheses and take first segment before comma
  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    const firstPart = parenMatch[1].split(',')[0]?.trim();
    if (firstPart) return firstPart;
  }
  // Fallback: capture number+unit pattern
  const numUnit = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(mg\/dL|mmhg|bpm|%|°?[cf]|ng\/mL|g\/dL|fL|pg)/i);
  if (numUnit) return `${numUnit[1]} ${numUnit[2]}`.trim();
  // Blood pressure pattern like 120/80
  const bp = text.match(/([0-9]{2,3}\/[0-9]{2,3})\s*(mmhg)?/i);
  if (bp) return `${bp[1]}${bp[2] ? ` ${bp[2]}` : ''}`.trim();
  return null;
}

export function extractVitalsFromSummary(content: any): AIVital[] {
  try {
    const parsed = parseSummaryContent(content) || {};
    const buckets = [
      { key: 'high_priority', fallback: 'high' as VitalStatus },
      { key: 'medium_priority', fallback: 'high' as VitalStatus },
      { key: 'low_priority', fallback: 'normal' as VitalStatus },
    ];

    const vitals: AIVital[] = [];

    for (const bucket of buckets) {
      const list = parsed?.[bucket.key]?.findings as Array<any> | undefined;
      if (!Array.isArray(list)) continue;

      for (const item of list) {
        const text: string = item?.text || item?.finding || '';
        if (!text) continue;
        const vType = detectVitalType(text);
        if (!vType) continue;
        const value = extractPrimaryValueSegment(text) || '';
        const status = inferStatusFromText(text, bucket.fallback);
        vitals.push({ type: vType, value, status });
      }
    }

    // Deduplicate by type keeping the first (higher priority) occurrence
    const unique: Record<string, AIVital> = {};
    for (const v of vitals) {
      if (!unique[v.type]) unique[v.type] = v;
    }

    return Object.values(unique);
  } catch (e) {
    console.warn('Failed to extract vitals from summary:', e);
    return [];
  }
}

function mapStatusToSeverity(status: 'critical' | 'high' | 'low' | 'abnormal'): 'critical' | 'warning' | 'info' {
  switch (status) {
    case 'critical':
      return 'critical';
    case 'high':
    case 'low':
    case 'abnormal':
      return 'warning';
    default:
      return 'info';
  }
}

export function extractActionItemsFromSummary(content: any): AIActionItem[] {
  try {
    const parsed = parseSummaryContent(content) || {};
    const buckets = [
      { key: 'high_priority', defaultStatus: 'high' as const },
      { key: 'medium_priority', defaultStatus: 'abnormal' as const },
    ];

    const items: AIActionItem[] = [];

    for (const bucket of buckets) {
      const list = parsed?.[bucket.key]?.findings as Array<any> | undefined;
      if (!Array.isArray(list)) continue;

      for (const item of list) {
        const text: string = item?.text || item?.finding || '';
        if (!text) continue;
        const value = extractPrimaryValueSegment(text) || '';
        let status: 'critical' | 'high' | 'low' | 'abnormal' = bucket.defaultStatus;
        const inferred = inferStatusFromText(text);
        if (inferred === 'critical' || inferred === 'high' || inferred === 'low') {
          status = inferred;
        } else if (bucket.key === 'medium_priority') {
          status = 'abnormal';
        }
        const testName = text.split('(')[0].trim();
        const id = `${testName}-${status}-${value}`.toLowerCase().replace(/\s+/g, '-');
        const severity = mapStatusToSeverity(status);
        items.push({ id, testName, value, status, severity });
      }
    }

    return items;
  } catch (e) {
    console.warn('Failed to extract action items from summary:', e);
    return [];
  }
}
