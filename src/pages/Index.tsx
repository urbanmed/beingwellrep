import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, TrendingUp, Plus, Loader2, FolderOpen, Shield, Zap, AlertTriangle, Pill, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReports } from "@/hooks/useReports";
import { useState, useEffect, useRef } from 'react';
import { useFamilyMemberContext } from "@/contexts/FamilyMemberContext";
import { useSosActivation } from '@/hooks/useSosActivation';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { SosCountdownModal } from '@/components/sos/SosCountdownModal';

import { RecommendationsSummary } from '@/components/dashboard/RecommendationsSummary';
import { ActionItems } from '@/components/dashboard/ActionItems';
import { RecentReportsVault } from '@/components/dashboard/RecentReportsVault';
import { AIInsightsCarousel } from '@/components/dashboard/AIInsightsCarousel';
import { TrendsTimelineMini } from '@/components/dashboard/TrendsTimelineMini';
import { HealthTasksReminders } from '@/components/dashboard/HealthTasksReminders';
import { PersonalizedTipsHealth } from '@/components/dashboard/PersonalizedTipsHealth';

import { getLocation } from '@/lib/utils/location';

const Index = () => {
  const navigate = useNavigate();
  const { selectedMemberId } = useFamilyMemberContext();
  const { reports, loading } = useReports(selectedMemberId);
  
  // SOS functionality
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [currentActivation, setCurrentActivation] = useState<string | null>(null);
  const { triggerSos, cancelSos, completeSos, activating } = useSosActivation();
  const { contacts } = useEmergencyContacts();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const hasReports = reports.length > 0;
  const completedReports = reports.filter(r => r.parsing_status === 'completed');
  const processingReports = reports.filter(r => r.parsing_status === 'processing');
  const failedReports = reports.filter(r => r.parsing_status === 'failed');

  const handleSosClick = async () => {
    // Check if user has emergency contacts
    if (contacts.length === 0) {
      alert('Please add emergency contacts in your profile before using SOS.');
      return;
    }

    // Get user location if available (Capacitor with web fallback)
    const locationData = await getLocation({ enableHighAccuracy: true, timeout: 8000 });

    // Trigger SOS activation in database
    const result = await triggerSos(locationData);
    if (result.error) return;

    // Start countdown
    setCurrentActivation(result.data.id);
    setShowCountdown(true);
    setCountdown(30);
    startCountdown();
  };

  const startCountdown = () => {
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleCountdownComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCountdownComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (currentActivation) {
      // Complete the SOS activation (this will trigger SMS sending in the future)
      completeSos(currentActivation);
      alert('Emergency alert sent to your contacts!');
    }
    
    setShowCountdown(false);
    setCurrentActivation(null);
  };

  const handleCancel = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (currentActivation) {
      await cancelSos(currentActivation);
    }

    setShowCountdown(false);
    setCurrentActivation(null);
    setCountdown(30);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-3 grid-rows-2 gap-3 sm:gap-4">
          {/* Reports */}
        <Card
          aria-label="Open Reports"
          className="cursor-pointer hover:shadow-md transition-shadow col-start-1 row-start-1 medical-card-shadow"
          onClick={() => navigate('/reports')}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="medical-subheading">Reports</span>
              <div className="rounded-lg bg-primary/10 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card
          aria-label="Open Insights"
          className="cursor-pointer hover:shadow-md transition-shadow col-start-2 row-start-1 medical-card-shadow"
          onClick={() => navigate('/summaries')}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="medical-subheading">Insights</span>
              <div className="rounded-lg bg-primary/10 p-2">
                <Brain className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SOS - standout spanning 2 rows */}
        <Card
          aria-label="Trigger SOS"
          className="bg-destructive/90 border-destructive cursor-pointer hover:bg-destructive transition-colors col-start-3 row-span-2 medical-card-shadow"
          onClick={handleSosClick}
        >
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <span className="medical-subheading text-destructive-foreground">SOS</span>
              <div className="rounded-lg bg-destructive-foreground/20 p-2">
                <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions */}
        <Card
          aria-label="Open Prescriptions"
          className="cursor-pointer hover:shadow-md transition-shadow col-start-1 row-start-2 medical-card-shadow"
          onClick={() => navigate('/prescriptions')}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="medical-subheading">Prescriptions</span>
              <div className="rounded-lg bg-primary/10 p-2">
                <Pill className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Cards */}
        <Card
          aria-label="Open My Cards"
          className="cursor-pointer hover:shadow-md transition-shadow col-start-2 row-start-2 medical-card-shadow"
          onClick={() => navigate('/cards')}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="medical-subheading">My Cards</span>
              <div className="rounded-lg bg-primary/10 p-2">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RecommendationsSummary />
        <ActionItems />
      </div>


      {/* Recent Reports */}
      <RecentReportsVault />

      {/* Insights and Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AIInsightsCarousel />
        <TrendsTimelineMini />
      </div>

      {/* Tasks and Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HealthTasksReminders />
        <PersonalizedTipsHealth />
      </div>

      {/* Quick Access */}
      <div className="space-y-4">
        <h2 className="medical-heading-sm">Quick Access</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <SosCountdownModal
        open={showCountdown}
        countdown={countdown}
        onCancel={handleCancel}
        emergencyContacts={contacts.slice(0, 2)} // Only show first 2 contacts
      />
    </div>
  );
};

export default Index;
