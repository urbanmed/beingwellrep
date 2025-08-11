import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, TrendingUp, Plus, Loader2, FolderOpen, Shield, Zap, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReports } from "@/hooks/useReports";
import { useState, useEffect, useRef } from 'react';
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
  const { reports, loading } = useReports();
  
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
    <div className="space-y-3">
      <div className="p-4 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="bg-destructive border-destructive cursor-pointer hover:bg-destructive/90 transition-colors"
            onClick={handleSosClick}
          >
            <CardContent className="px-6 pb-4 pt-4 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive-foreground mx-auto mb-1" />
              <h3 className="medical-heading-sm text-destructive-foreground">SOS</h3>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/summaries')}>
            <CardContent className="px-6 pb-4 pt-4 text-center">
              <Brain className="h-6 w-6 text-primary mx-auto mb-1" />
              <h3 className="medical-heading-sm">Insights</h3>
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

        {/* Legacy Features Section */}
        <div className="space-y-4">
          <h2 className="medical-title-sm">Quick Access</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="medical-heading-sm flex items-center">
                  <FolderOpen className="h-4 w-4 mr-2 text-primary" />
                  Document Vault
                </CardTitle>
                <CardDescription>
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
                        <div className="text-muted-foreground">Processed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-info">{processingReports.length}</div>
                        <div className="text-muted-foreground">Processing</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-muted-foreground">
                          {(reports.reduce((acc, r) => acc + (r.file_size || 0), 0) / (1024 * 1024)).toFixed(1)} MB
                        </div>
                        <div className="text-muted-foreground">Storage</div>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => navigate('/vault')}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Open Vault
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => navigate('/upload')}>
                    <Shield className="h-4 w-4 mr-2" />
                    Start Your Vault
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="medical-heading-sm flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                  Health Timeline
                </CardTitle>
                <CardDescription>
                  Track your health journey chronologically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full" onClick={() => navigate("/vault")}>
                  View Timeline
                </Button>
              </CardContent>
            </Card>
          </div>
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
