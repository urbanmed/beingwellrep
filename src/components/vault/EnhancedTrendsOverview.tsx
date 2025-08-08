import { useMemo } from "react";
import { isWithinInterval, subDays, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Stethoscope,
  Plus,
  Settings
} from "lucide-react";
import { useDismissedRecommendations } from "@/hooks/useDismissedRecommendations";
import { useRecommendationPreferences } from "@/hooks/useRecommendationPreferences";
import { RecommendationCard } from "./RecommendationCard";
import { AIInsightsCarousel } from "@/components/dashboard/AIInsightsCarousel";
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

// Enhanced test recommendations with severity levels
const getTestRecommendations = (reports: Report[]) => {
  const recommendations: Array<{ 
    test: string; 
    reason: string; 
    urgency: 'critical' | 'high' | 'medium' | 'low' | 'informational';
    lastDone?: string;
    specialty?: string;
  }> = [];
  
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // Check for recent blood tests
  const recentBloodTests = reports.filter(report => {
    const reportDate = new Date(report.report_date);
    return reportDate >= threeMonthsAgo && 
           (report.report_type?.toLowerCase().includes('blood') || 
            report.report_type?.toLowerCase().includes('lab') ||
            report.extracted_text?.toLowerCase().includes('hemoglobin') ||
            report.extracted_text?.toLowerCase().includes('glucose'));
  });

  // Check for cardiac-related history
  const hasCardiacHistory = reports.some(report => 
    report.extracted_text?.toLowerCase().includes('cardiac') ||
    report.extracted_text?.toLowerCase().includes('heart') ||
    report.extracted_text?.toLowerCase().includes('ecg') ||
    report.extracted_text?.toLowerCase().includes('ekg')
  );

  // Check for diabetes indicators
  const hasDiabetesHistory = reports.some(report => 
    report.extracted_text?.toLowerCase().includes('diabetes') ||
    report.extracted_text?.toLowerCase().includes('glucose') ||
    report.extracted_text?.toLowerCase().includes('insulin') ||
    report.extracted_text?.toLowerCase().includes('hba1c')
  );

  // Check for cholesterol levels
  const hasRecentCholesterol = reports.some(report => {
    const reportDate = new Date(report.report_date);
    return reportDate >= oneYearAgo && 
           (report.extracted_text?.toLowerCase().includes('cholesterol') ||
            report.extracted_text?.toLowerCase().includes('lipid') ||
            report.extracted_text?.toLowerCase().includes('ldl') ||
            report.extracted_text?.toLowerCase().includes('hdl'));
  });

  // Critical findings require immediate attention
  const criticalFindings = reports.filter(report => 
    report.is_critical || 
    report.extracted_text?.toLowerCase().includes('urgent') ||
    report.extracted_text?.toLowerCase().includes('immediate')
  );

  if (criticalFindings.length > 0) {
    recommendations.push({
      test: "Follow-up Consultation",
      urgency: "critical",
      reason: "Critical findings detected in recent reports require immediate medical attention.",
      lastDone: "N/A",
      specialty: "Specialist Referral"
    });
  }

  // Recommend routine blood work if none in 3 months
  if (recentBloodTests.length === 0) {
    recommendations.push({
      test: "Complete Blood Count (CBC)",
      urgency: "medium",
      reason: "No recent blood work found. Regular monitoring helps detect early health issues.",
      lastDone: recentBloodTests.length > 0 ? "More than 3 months ago" : "Unknown",
      specialty: "General Medicine"
    });
  }

  // Recommend cardiac screening if history exists but no recent tests
  if (hasCardiacHistory && !reports.some(r => new Date(r.report_date) >= threeMonthsAgo && r.report_type?.toLowerCase().includes('cardiac'))) {
    recommendations.push({
      test: "Cardiac Follow-up",
      urgency: "high",
      reason: "Cardiac history detected. Regular monitoring recommended.",
      lastDone: "More than 3 months ago",
      specialty: "Cardiology"
    });
  }

  // Recommend diabetes monitoring if history exists
  if (hasDiabetesHistory && recentBloodTests.length === 0) {
    recommendations.push({
      test: "HbA1c Test",
      urgency: "high",
      reason: "Diabetes history detected. Regular glucose monitoring is essential.",
      lastDone: "More than 3 months ago",
      specialty: "Endocrinology"
    });
  }

  // Recommend cholesterol screening
  if (!hasRecentCholesterol) {
    recommendations.push({
      test: "Lipid Profile",
      urgency: "low",
      reason: "Annual cholesterol screening recommended for cardiovascular health.",
      lastDone: "More than 1 year ago",
      specialty: "General Medicine"
    });
  }

  return recommendations.slice(0, 4); // Increased to 4 recommendations
};

export function EnhancedTrendsOverview({ reports, onNavigateToUpload }: EnhancedTrendsOverviewProps) {
  const { preferences } = useRecommendationPreferences();
  const { isDismissed } = useDismissedRecommendations();
  
  const analytics = useMemo(() => {
    const now = new Date();
    
    // Current month data for critical document analysis
    const currentMonth = reports.filter(r => 
      isWithinInterval(new Date(r.report_date), { 
        start: startOfDay(subDays(now, 30)), 
        end: endOfDay(now) 
      })
    );

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

    // Get test recommendations (filtered by preferences and dismissals)
    const allRecommendations = getTestRecommendations(reports);
    const recommendations = allRecommendations.filter(rec => {
      const urgencyLevels = ['informational', 'low', 'medium', 'high', 'critical'];
      const thresholdIndex = urgencyLevels.indexOf(preferences.urgency_threshold);
      const recUrgencyIndex = urgencyLevels.indexOf(rec.urgency);
      
      // Filter by urgency threshold
      if (recUrgencyIndex < thresholdIndex) return false;
      
      // Filter by specialty preference if set
      if (preferences.preferred_specialties.length > 0 && rec.specialty) {
        if (!preferences.preferred_specialties.includes(rec.specialty)) return false;
      }
      
      // Filter dismissed items if preference is set
      if (preferences.hide_dismissed) {
        const key = `${rec.test}-${rec.specialty || 'general'}`;
        if (isDismissed('medical_test', key)) return false;
      }
      
      return true;
    });

    return {
      criticalDocs,
      failedProcessing,
      missingData,
      typeDistribution,
      missingTypes,
      recommendations
    };
  }, [reports, preferences, isDismissed]);


  return (
    <div className="space-y-4">
      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
<div className="lg:col-span-2">
  <AIInsightsCarousel />
</div>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                <span>Recommendations</span>
                {analytics.recommendations.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {analytics.recommendations.length}
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.recommendations.length > 0 ? (
              <div className="space-y-3">
                {analytics.recommendations.map((rec, index) => (
                  <RecommendationCard 
                    key={`${rec.test}-${index}`}
                    recommendation={rec}
                    onDismiss={() => {
                      // Trigger re-render - in a real app you'd use proper state management
                      window.location.reload();
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recommendations match your current preferences</p>
                <p className="text-xs text-muted-foreground">Adjust your settings or upload more documents for personalized insights</p>
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