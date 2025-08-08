import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";

export interface MetricPoint {
  date: string; // ISO string
  label: string; // formatted date label
  value: number;
}

export interface MetricSeries {
  key: string;
  label: string;
  unit?: string;
  points: MetricPoint[];
}

interface HighRiskTrendChartsProps {
  series: MetricSeries[];
}

export function HighRiskTrendCharts({ series }: HighRiskTrendChartsProps) {
  if (!series || series.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>High-risk trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {series.map((s) => (
            <div key={s.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{s.label}</Badge>
                  {s.unit && <span className="text-xs text-muted-foreground">({s.unit})</span>}
                </div>
                {s.points.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Latest: {s.points[s.points.length - 1].value}
                    {s.unit ? ` ${s.unit}` : ''}
                  </span>
                )}
              </div>
              <div className="h-48">
                <ChartContainer
                  config={{
                    [s.key]: {
                      label: s.label,
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="w-full h-full"
                >
                  <LineChart data={s.points} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} width={32} allowDecimals />
                    <ChartTooltip content={<ChartTooltipContent nameKey={s.key} />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={s.key}
                      dot={false}
                      strokeWidth={2}
                      stroke={`var(--color-${s.key})`}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
