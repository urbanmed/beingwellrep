import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, TestTube, TrendingUp, Activity, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, ResponsiveContainer } from "recharts";
export function VaultSummary() {
  const navigate = useNavigate();
  const { reports } = useReports();

  const summaryStats = useMemo(() => {
    if (!reports.length) {
      return {
        totalReports: 0,
        lastUpdateDate: null,
        uniqueTestTypes: 0,
        healthScore: 0,
        trendingMetric: null,
        criticalReports: 0,
        processingErrors: 0
      };
    }

    // Calculate basic stats
    const totalReports = reports.length;
    const lastUpdateDate = reports.reduce((latest, report) => {
      const reportDate = parseISO(report.updated_at);
      return reportDate > latest ? reportDate : latest;
    }, parseISO(reports[0].updated_at));

    // Calculate unique test types from parsed data
    const testTypes = new Set<string>();
    reports.forEach(report => {
      if (report.parsed_data?.tests) {
        report.parsed_data.tests.forEach((test: any) => {
          if (test.name) testTypes.add(test.name.toLowerCase());
        });
      }
      if (report.parsed_data?.vitals) {
        Object.keys(report.parsed_data.vitals).forEach(vital => {
          testTypes.add(vital.toLowerCase());
        });
      }
      // Add report type as a general category
      testTypes.add(report.report_type);
    });

    // Calculate AI Health Score based on data quality and completeness
    const reportsWithData = reports.filter(r => r.parsed_data && r.extraction_confidence && r.extraction_confidence > 0.7);
    const avgConfidence = reportsWithData.length > 0 
      ? reportsWithData.reduce((sum, r) => sum + (r.extraction_confidence || 0), 0) / reportsWithData.length
      : 0;
    
    const dataCompleteness = reports.filter(r => 
      r.physician_name && r.facility_name && r.extracted_text
    ).length / totalReports;
    
    const healthScore = Math.round((avgConfidence * 0.6 + dataCompleteness * 0.4) * 100);

    // Find trending metric (simplified - looking for recent improvements)
    const recentReports = reports
      .filter(r => r.parsed_data?.tests)
      .sort((a, b) => parseISO(b.report_date).getTime() - parseISO(a.report_date).getTime())
      .slice(0, 5);

    let trendingMetric = null;
    if (recentReports.length >= 2) {
      // Look for common test improvements (simplified)
      const commonTests = ['vitamin d', 'cholesterol', 'glucose', 'hemoglobin'];
      for (const testName of commonTests) {
        const hasRecentTest = recentReports.some(r => 
          r.parsed_data?.tests?.some((test: any) => 
            test.name?.toLowerCase().includes(testName)
          )
        );
        if (hasRecentTest) {
          trendingMetric = `Your ${testName} levels are being monitored`;
          break;
        }
      }
    }

    const criticalReports = reports.filter(r => r.is_critical).length;
    const processingErrors = reports.filter(r => r.parsing_status === 'failed').length;

    return {
      totalReports,
      lastUpdateDate,
      uniqueTestTypes: testTypes.size,
      healthScore,
      trendingMetric,
      criticalReports,
      processingErrors
    };
  }, [reports]);

  const handleViewAnalytics = () => {
    // Navigate to a detailed analytics view (could be AI Assistant or a new analytics page)
    navigate('/ai-assistant');
  };

  return (
    <Card className="medical-card-shadow border-accent/20 hover:border-accent/40 transition-colors cursor-pointer" onClick={handleViewAnalytics}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Health Summary
          <Badge variant="secondary" className="ml-auto">
            AI Score: {summaryStats.healthScore}%
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <FileText className="h-4 w-4 text-primary mr-1" />
            </div>
            <div className="text-2xl font-bold text-foreground">{summaryStats.totalReports}</div>
            <div className="text-xs text-muted-foreground">Reports</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TestTube className="h-4 w-4 text-primary mr-1" />
            </div>
            <div className="text-2xl font-bold text-foreground">{summaryStats.uniqueTestTypes}</div>
            <div className="text-xs text-muted-foreground">Test Types</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-primary mr-1" />
            </div>
            <div className="text-sm font-medium text-foreground">
              {summaryStats.lastUpdateDate ? format(summaryStats.lastUpdateDate, 'MMM d') : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Last Update</div>
          </div>
        </div>

        {/* AI Health Score */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">AI Health Score</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-secondary rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${summaryStats.healthScore}%` }}
              />
            </div>
            <span className="text-lg font-bold text-primary">{summaryStats.healthScore}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Based on data quality and completeness
          </p>
        </div>

        {/* Trending Insight */}
        {summaryStats.trendingMetric && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Health Insight</span>
            </div>
            <p className="text-sm text-foreground mt-1">{summaryStats.trendingMetric} 📈</p>
          </div>
        )}

        {/* Status Indicators */}
        {(summaryStats.criticalReports > 0 || summaryStats.processingErrors > 0) && (
          <div className="flex gap-2">
            {summaryStats.criticalReports > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {summaryStats.criticalReports} Critical
              </Badge>
            )}
            {summaryStats.processingErrors > 0 && (
              <Badge variant="outline" className="text-xs border-destructive text-destructive">
                {summaryStats.processingErrors} Processing Errors
              </Badge>
            )}
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant="outline" 
          className="w-full mt-4 border-primary/20 hover:border-primary/40"
          onClick={(e) => {
            e.stopPropagation();
            handleViewAnalytics();
          }}
        >
          View Detailed Analytics
        </Button>
      </CardContent>
    </Card>
  );
}