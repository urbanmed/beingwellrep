import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, TrendingUp, Plus, Loader2, FolderOpen, Shield, Zap, AlertTriangle, Pill, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReports } from "@/hooks/useReports";
import { SosButton } from '@/components/sos/SosButton';

import { RecommendationsSummary } from '@/components/dashboard/RecommendationsSummary';
import { ActionItems } from '@/components/dashboard/ActionItems';
import { RecentReportsVault } from '@/components/dashboard/RecentReportsVault';
import { LazyAIInsightsCarousel } from '@/components/dashboard/LazyAIInsightsCarousel';

import { HealthTasksReminders } from '@/components/dashboard/HealthTasksReminders';
import { PersonalizedTipsHealth } from '@/components/dashboard/PersonalizedTipsHealth';



const Index = () => {
  const navigate = useNavigate();
  const { reports, loading } = useReports();

  const hasReports = reports.length > 0;
  const completedReports = reports.filter(r => r.parsing_status === 'completed');
  const processingReports = reports.filter(r => r.parsing_status === 'processing');
  const failedReports = reports.filter(r => r.parsing_status === 'failed');

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-safe">
      {/* Quick Actions */}
      <div className="grid grid-cols-3 grid-rows-2 gap-2 sm:gap-3 lg:gap-4">
          {/* Reports */}
        <Card
          aria-label="Open Reports"
          className="cursor-pointer hover:shadow-md transition-shadow col-start-1 row-start-1 medical-card-shadow min-h-[44px] active:scale-95 transition-transform"
          onClick={() => navigate('/vault')}
        >
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Reports</span>
              <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card
          aria-label="Open Insights"
          className="cursor-pointer hover:shadow-md transition-shadow col-start-2 row-start-1 medical-card-shadow min-h-[44px] active:scale-95 transition-transform"
          onClick={() => navigate('/summaries')}
        >
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Insights</span>
              <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SOS - standout spanning 2 rows */}
        <div className="col-start-3 row-span-2 h-full">
          <SosButton 
            variant="destructive" 
            className="w-full h-full bg-destructive/90 border-destructive hover:bg-destructive transition-colors medical-card-shadow rounded-lg p-2.5 sm:p-3 flex flex-col justify-center text-xs sm:text-sm font-medium" 
          />
        </div>

        {/* Prescriptions */}
        <Card
          aria-label="Open Prescriptions"
          className="cursor-pointer hover:shadow-md transition-shadow col-start-1 row-start-2 medical-card-shadow min-h-[44px] active:scale-95 transition-transform"
          onClick={() => navigate('/prescriptions')}
        >
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Prescriptions</span>
              <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2">
                <Pill className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Cards */}
        <Card
          aria-label="Open My Cards"
          className="cursor-pointer hover:shadow-md transition-shadow col-start-2 row-start-2 medical-card-shadow min-h-[44px] active:scale-95 transition-transform"
          onClick={() => navigate('/cards')}
        >
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">My Cards</span>
              <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <RecommendationsSummary />
        <ActionItems />
      </div>


      {/* Recent Reports */}
      <RecentReportsVault />

      {/* AI Insights */}
      <LazyAIInsightsCarousel />

      {/* Tasks and Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <HealthTasksReminders />
        <PersonalizedTipsHealth />
      </div>

      {/* Quick Access */}
      <div className="space-y-4">
        <h2 className="medical-heading-sm">Quick Access</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Card className="medical-card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="medical-subheading flex items-center">
                <FolderOpen className="h-4 w-4 mr-2 text-primary" />
                Document Vault
              </CardTitle>
              <CardDescription className="medical-annotation">
                {hasReports 
                  ? "Secure storage for all your medical documents"
                  : "Start building your digital health record"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasReports ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-success">{completedReports.length}</div>
                      <div className="medical-annotation text-muted-foreground">Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-info">{processingReports.length}</div>
                      <div className="medical-annotation text-muted-foreground">Processing</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-muted-foreground">
                        {(reports.reduce((acc, r) => acc + (r.file_size || 0), 0) / (1024 * 1024)).toFixed(1)} MB
                      </div>
                      <div className="medical-annotation text-muted-foreground">Storage</div>
                    </div>
                  </div>
                  <Button className="w-full rounded-full h-9" onClick={() => navigate('/vault')}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Open Vault
                  </Button>
                </div>
              ) : (
                <Button className="w-full rounded-full h-9" onClick={() => navigate('/upload')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Start Your Vault
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="medical-card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="medical-subheading flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                Health Timeline
              </CardTitle>
              <CardDescription className="medical-annotation">
                Track your health journey chronologically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full rounded-full h-9" onClick={() => navigate("/vault")}>
                View Timeline
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
};

export default Index;
