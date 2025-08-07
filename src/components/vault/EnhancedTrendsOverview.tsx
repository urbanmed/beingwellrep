import { useMemo } from "react";
import { format, isWithinInterval, subDays, startOfDay, endOfDay, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipInfo } from "@/components/ui/tooltip-info";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar, 
  Target,
  FileX,
  Heart,
  Stethoscope,
  Plus
} from "lucide-react";

interface Report {
  id: string;
  title: string;
  report_type: string;
  report_date: string;
  is_critical: boolean;
  physician_name: string | null;
  facility_name: string | null;
  parsing_status: string;
  extracted_text: string | null;
}

interface EnhancedTrendsOverviewProps {
  reports: Report[];
  onNavigateToUpload?: () => void;
}

// Common test recommendations based on age and medical history patterns
const getTestRecommendations = (reports: Report[]) => {
  const recommendations: Array<{ test: string; reason: string; urgency: 'high' | 'medium' | 'low' }> = [];
  
  const lastBloodTest = reports
    .filter(r => r.report_type === 'blood_test')
    .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())[0];
  
  const lastPrescription = reports
    .filter(r => r.report_type === 'prescription')
    .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())[0];

  const lastRadiology = reports
    .filter(r => r.report_type === 'radiology')
    .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())[0];

  // Blood test recommendations
  if (!lastBloodTest || isWithinInterval(new Date(lastBloodTest.report_date), {
    start: startOfDay(subDays(new Date(), 365)),
    end: endOfDay(new Date())
  })) {
    recommendations.push({
      test: "Annual Blood Panel",
      reason: "Last blood test over 12 months ago",
      urgency: 'medium'
    });
  }

  // Prescription follow-ups
  if (lastPrescription && isWithinInterval(new Date(lastPrescription.report_date), {
    start: startOfDay(subDays(new Date(), 90)),
    end: endOfDay(new Date())
  })) {
    recommendations.push({
      test: "Medication Review",
      reason: "Recent prescription may need follow-up",
      urgency: 'medium'
    });
  }

  // Preventive care based on document patterns
  const hasCardiacHistory = reports.some(r => 
    r.extracted_text?.toLowerCase().includes('cardiac') ||
    r.extracted_text?.toLowerCase().includes('heart') ||
    r.extracted_text?.toLowerCase().includes('blood pressure')
  );

  if (hasCardiacHistory && (!lastRadiology || !isWithinInterval(new Date(lastRadiology.report_date), {
    start: startOfDay(subDays(new Date(), 180)),
    end: endOfDay(new Date())
  }))) {
    recommendations.push({
      test: "Cardiac Screening",
      reason: "History suggests cardiac monitoring needed",
      urgency: 'high'
    });
  }

  return recommendations.slice(0, 2); // Limit to 2 most important
};

export function EnhancedTrendsOverview({ reports, onNavigateToUpload }: EnhancedTrendsOverviewProps) {
  const analytics = useMemo(() => {
    const now = new Date();
    
    // Current month data
    const currentMonth = reports.filter(r => 
      isWithinInterval(new Date(r.report_date), { 
        start: startOfDay(subDays(now, 30)), 
        end: endOfDay(now) 
      })
    );
    
    // Previous month data
    const previousMonth = reports.filter(r => 
      isWithinInterval(new Date(r.report_date), { 
        start: startOfDay(subDays(now, 60)), 
        end: startOfDay(subDays(now, 30))
      })
    );

    // Calculate trends
    const trends = {
      total: currentMonth.length - previousMonth.length,
      bloodTests: currentMonth.filter(r => r.report_type === 'blood_test').length - 
                  previousMonth.filter(r => r.report_type === 'blood_test').length,
      prescriptions: currentMonth.filter(r => r.report_type === 'prescription').length - 
                    previousMonth.filter(r => r.report_type === 'prescription').length,
    };

    // Analyze critical documents
    const criticalDocs = currentMonth.filter(r => r.is_critical);
    const failedProcessing = reports.filter(r => r.parsing_status === 'failed');
    const missingData = reports.filter(r => !r.physician_name || !r.facility_name || !r.extracted_text);

    // Document type distribution
    const typeDistribution = reports.reduce((acc, report) => {
      acc[report.report_type] = (acc[report.report_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find gaps in document types
    const commonTypes = ['blood_test', 'prescription', 'radiology', 'consultation'];
    const missingTypes = commonTypes.filter(type => !typeDistribution[type]);

    // Get test recommendations
    const recommendations = getTestRecommendations(reports);

    return {
      trends,
      criticalDocs,
      failedProcessing,
      missingData,
      typeDistribution,
      missingTypes,
      recommendations,
      currentMonth,
      previousMonth
    };
  }, [reports]);

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-3 w-3 text-success" />;
    if (value < 0) return <TrendingDown className="h-3 w-3 text-destructive" />;
    return null;
  };

  const formatTrendText = (current: number, change: number) => {
    if (change === 0) return "No change from last month";
    const direction = change > 0 ? "increase" : "decrease";
    return `${Math.abs(change)} ${direction} from last month`;
  };

  return (
    <div className="space-y-4">
      {/* Main Trends Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Health Activity Overview</span>
            <TooltipInfo content="Overview of your recent health document activity and trends compared to the previous month." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Activity */}
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium">Total Activity</span>
                  {getTrendIcon(analytics.trends.total)}
                  <TooltipInfo content="Total number of documents added this month compared to last month." />
                </div>
                <div className="text-2xl font-bold text-primary">{analytics.currentMonth.length}</div>
                <div className="text-xs text-muted-foreground">
                  {formatTrendText(analytics.currentMonth.length, analytics.trends.total)}
                </div>
              </div>
            </div>
            
            {/* Blood Tests */}
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <span className="text-sm">🩸</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium">Blood Tests</span>
                  {getTrendIcon(analytics.trends.bloodTests)}
                  <TooltipInfo content="Number of blood test reports added this month." />
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {analytics.currentMonth.filter(r => r.report_type === 'blood_test').length}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTrendText(
                    analytics.currentMonth.filter(r => r.report_type === 'blood_test').length, 
                    analytics.trends.bloodTests
                  )}
                </div>
              </div>
            </div>
            
            {/* Prescriptions */}
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <span className="text-sm">💊</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium">Prescriptions</span>
                  {getTrendIcon(analytics.trends.prescriptions)}
                  <TooltipInfo content="Number of prescription documents added this month." />
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {analytics.currentMonth.filter(r => r.report_type === 'prescription').length}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTrendText(
                    analytics.currentMonth.filter(r => r.report_type === 'prescription').length, 
                    analytics.trends.prescriptions
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Health Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Critical Documents Alert */}
            {analytics.criticalDocs.length > 0 && (
              <div className="flex items-start space-x-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    {analytics.criticalDocs.length} Critical Document{analytics.criticalDocs.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-300">
                    Requires attention from your healthcare provider
                  </p>
                </div>
              </div>
            )}

            {/* Missing Document Types */}
            {analytics.missingTypes.length > 0 && (
              <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FileX className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Missing Document Types
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    Consider adding: {analytics.missingTypes.map(type => type.replace('_', ' ')).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Processing Issues */}
            {analytics.failedProcessing.length > 0 && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {analytics.failedProcessing.length} Document{analytics.failedProcessing.length !== 1 ? 's' : ''} Need Attention
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300">
                    Processing failed - may need re-upload
                  </p>
                </div>
              </div>
            )}

            {/* Data Quality */}
            {analytics.missingData.length > 0 && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <FileX className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {analytics.missingData.length} Document{analytics.missingData.length !== 1 ? 's' : ''} Missing Details
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-300">
                    Physician or facility information incomplete
                  </p>
                </div>
              </div>
            )}

            {/* All Good State */}
            {analytics.criticalDocs.length === 0 && 
             analytics.failedProcessing.length === 0 && 
             analytics.missingData.length === 0 && (
              <div className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Heart className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    All Documents Processed Successfully
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-300">
                    Your health records are well organized
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <span>Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.recommendations.length > 0 ? (
              analytics.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-primary/5 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">{rec.test}</p>
                      <Badge variant={rec.urgency === 'high' ? 'destructive' : rec.urgency === 'medium' ? 'default' : 'secondary'}>
                        {rec.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No specific recommendations at this time</p>
                <p className="text-xs text-muted-foreground">Keep up with regular health monitoring</p>
              </div>
            )}

            {onNavigateToUpload && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onNavigateToUpload}
                className="w-full mt-3"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Document
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}