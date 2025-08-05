import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Star, StarOff, Download, Share, TrendingUp, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { Summary } from "@/types/summary";

interface EnhancedSummaryViewerProps {
  summary: Summary;
  onPin?: (summaryId: string) => Promise<void>;
  onRate?: (summaryId: string, rating: number) => Promise<void>;
  sourceReports?: Array<{
    id: string;
    title: string;
    parsed_data: any;
    report_type: string;
    report_date: string;
  }>;
}

export function EnhancedSummaryViewer({ 
  summary, 
  onPin, 
  onRate, 
  sourceReports = [] 
}: EnhancedSummaryViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePin = async () => {
    if (onPin) {
      await onPin(summary.id);
    }
  };

  const handleRate = async (rating: number) => {
    if (onRate) {
      await onRate(summary.id, rating);
    }
  };

  const renderTrends = () => {
    if (!sourceReports.length) return null;

    const labReports = sourceReports.filter(r => r.report_type === 'lab' && r.parsed_data?.tests);
    const vitalReports = sourceReports.filter(r => r.report_type === 'vitals' && r.parsed_data?.vitals);

    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4" />
          <h4 className="font-medium">Health Trends</h4>
        </div>
        
        {labReports.length > 1 && (
          <div className="mb-3">
            <h5 className="text-sm font-medium mb-2">Lab Results Over Time</h5>
            {renderLabTrends(labReports)}
          </div>
        )}
        
        {vitalReports.length > 1 && (
          <div>
            <h5 className="text-sm font-medium mb-2">Vital Signs Progression</h5>
            {renderVitalTrends(vitalReports)}
          </div>
        )}
      </Card>
    );
  };

  const renderLabTrends = (reports: any[]) => {
    const testsByName = new Map();
    
    reports.forEach(report => {
      report.parsed_data.tests?.forEach((test: any) => {
        if (!testsByName.has(test.name)) {
          testsByName.set(test.name, []);
        }
        testsByName.get(test.name).push({
          date: report.report_date,
          value: test.value,
          status: test.status,
          unit: test.unit
        });
      });
    });

    return (
      <div className="space-y-2">
        {Array.from(testsByName.entries()).slice(0, 3).map(([testName, results]) => (
          <div key={testName} className="text-sm">
            <span className="font-medium">{testName}:</span>
            <div className="flex gap-2 mt-1">
              {results.slice(-3).map((result: any, idx: number) => (
                <Badge 
                  key={idx}
                  variant={result.status === 'abnormal' ? 'destructive' : 'default'}
                  className="text-xs"
                >
                  {result.value} {result.unit}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVitalTrends = (reports: any[]) => {
    const vitalsByType = new Map();
    
    reports.forEach(report => {
      report.parsed_data.vitals?.forEach((vital: any) => {
        if (!vitalsByType.has(vital.type)) {
          vitalsByType.set(vital.type, []);
        }
        vitalsByType.get(vital.type).push({
          date: report.report_date,
          value: vital.value,
          unit: vital.unit
        });
      });
    });

    return (
      <div className="space-y-2">
        {Array.from(vitalsByType.entries()).slice(0, 3).map(([vitalType, results]) => (
          <div key={vitalType} className="text-sm">
            <span className="font-medium capitalize">{vitalType.replace('_', ' ')}:</span>
            <div className="flex gap-2 mt-1">
              {results.slice(-3).map((result: any, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {result.value} {result.unit}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderKeyInsights = () => {
    if (!sourceReports.length) return null;

    const insights = [];
    
    // Critical findings
    sourceReports.forEach(report => {
      if (report.parsed_data) {
        if (report.parsed_data.tests) {
          const criticalTests = report.parsed_data.tests.filter((test: any) => 
            test.status === 'critical' || test.status === 'abnormal'
          );
          if (criticalTests.length > 0) {
            insights.push({
              type: 'critical',
              message: `${criticalTests.length} abnormal lab result(s) in ${report.title}`,
              source: report.title
            });
          }
        }
        
        if (report.parsed_data.findings) {
          const abnormalFindings = report.parsed_data.findings.filter((finding: any) => 
            finding.severity === 'abnormal' || finding.severity === 'severe'
          );
          if (abnormalFindings.length > 0) {
            insights.push({
              type: 'warning',
              message: `${abnormalFindings.length} abnormal finding(s) in radiology report`,
              source: report.title
            });
          }
        }
      }
    });

    if (insights.length === 0) return null;

    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <h4 className="font-medium">Key Insights</h4>
        </div>
        <div className="space-y-2">
          {insights.slice(0, 3).map((insight, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className={`w-2 h-2 rounded-full mt-1.5 ${
                insight.type === 'critical' ? 'bg-red-500' : 'bg-orange-500'
              }`} />
              <div className="text-sm">
                <p>{insight.message}</p>
                <p className="text-muted-foreground text-xs">From: {insight.source}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {summary.title}
                {summary.is_pinned && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="capitalize">
                  {summary.summary_type.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(summary.generated_at).toLocaleDateString()}
                </span>
                {summary.confidence_score && (
                  <span className="text-sm text-muted-foreground">
                    Confidence: {Math.round(summary.confidence_score * 100)}%
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePin}
              >
                {summary.is_pinned ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className={`transition-all duration-200 ${
              isExpanded ? '' : 'line-clamp-4'
            }`}>
              {summary.content.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-2">{paragraph}</p>
              ))}
            </div>
            
            {summary.content.length > 300 && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0 h-auto"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>

          <Separator className="my-4" />

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium">Rate this summary:</span>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant="ghost"
                size="sm"
                onClick={() => handleRate(rating)}
                className="p-1"
              >
                <Star 
                  className={`h-4 w-4 ${
                    summary.user_rating && rating <= summary.user_rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </Button>
            ))}
          </div>

          {/* Source Reports */}
          <div className="text-sm text-muted-foreground">
            Based on {sourceReports.length} report(s)
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Analytics */}
      {renderKeyInsights()}
      {renderTrends()}
    </div>
  );
}