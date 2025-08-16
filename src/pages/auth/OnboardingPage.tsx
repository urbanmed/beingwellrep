import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkipDraftDialog } from "@/components/profile/SkipDraftDialog";
import { OnboardingStep1 } from "@/components/profile/OnboardingStep1";
import { OnboardingStep2 } from "@/components/profile/OnboardingStep2";
import { OnboardingStep3 } from "@/components/profile/OnboardingStep3";
import { OnboardingStep4 } from "@/components/profile/OnboardingStep4";
import { OnboardingStep5 } from "@/components/profile/OnboardingStep5";
import { useOptimisticUpdate } from "@/hooks/useOptimisticUpdate";
import { SkipForward } from "lucide-react";
import {
  BasicInfoFormData,
  MedicalInfoFormData,
  EmergencyContactFormData,
  PrivacySettingsFormData,
} from "@/lib/validations/profile";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [formData, setFormData] = useState<{
    step1?: BasicInfoFormData;
    step2?: MedicalInfoFormData;
    step3?: EmergencyContactFormData;
    step4?: PrivacySettingsFormData;
  }>({});
  const { execute: executeOptimistically } = useOptimisticUpdate();

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // Load any existing draft data on mount
  useEffect(() => {
    const loadDraftData = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const existingData: any = {};
          
          if (profile.first_name) {
            existingData.step1 = {
              first_name: profile.first_name || "",
              last_name: profile.last_name || "",
              date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth) : undefined,
              gender: profile.gender || "",
              phone_number: profile.phone_number || "",
              address: profile.address || "",
              preferred_language: profile.preferred_language || "english",
            };
          }

          if (profile.insurance_provider || profile.physician_name) {
            existingData.step2 = {
              insurance_provider: profile.insurance_provider || "",
              insurance_policy_number: profile.insurance_policy_number || "",
              physician_name: profile.physician_name || "",
              physician_phone: profile.physician_phone || "",
              physician_address: profile.physician_address || "",
              accessibility_needs: profile.accessibility_needs || [],
            };
          }

          if (profile.emergency_contact_name) {
            existingData.step3 = {
              emergency_contact_name: profile.emergency_contact_name || "",
              emergency_contact_phone: profile.emergency_contact_phone || "",
              emergency_contact_relationship: profile.emergency_contact_relationship || "",
            };
          }

          if (profile.privacy_settings) {
            existingData.step4 = {
              privacy_settings: profile.privacy_settings || {
                share_analytics: false,
                share_with_physician: true,
              },
              notification_preferences: profile.notification_preferences || {
                sms: false,
                push: true,
                email: true,
              },
            };
          }

          setFormData(existingData);
        }
      } catch (error) {
        // Silently handle error
      }
    };

    loadDraftData();
  }, [user]);

  // Save partial data to Supabase (upsert by user_id)
  const savePartial = async (partial: any) => {
    if (!user) return;
    const merged = {
      ...formData.step1,
      ...formData.step2,
      ...formData.step3,
      ...formData.step4,
      ...partial,
    } as any;

    const payload = {
      user_id: user.id,
      ...merged,
      date_of_birth: merged.date_of_birth ? new Date(merged.date_of_birth).toISOString().split('T')[0] : null,
    };

    await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
  };

  const handleStep1Complete = (data: BasicInfoFormData) => {
    setFormData(prev => ({ ...prev, step1: data }));
    void savePartial(data);
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: MedicalInfoFormData) => {
    setFormData(prev => ({ ...prev, step2: data }));
    void savePartial(data);
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: EmergencyContactFormData) => {
    setFormData(prev => ({ ...prev, step3: data }));
    void savePartial(data);
    setCurrentStep(4);
  };

  const handleStep4Complete = (data: PrivacySettingsFormData) => {
    setFormData(prev => ({ ...prev, step4: data }));
    void savePartial(data);
    setCurrentStep(5);
  };

  const handleOnboardingComplete = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const completeData = {
        user_id: user.id,
        ...formData.step1,
        ...formData.step2,
        ...formData.step3,
        ...formData.step4,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            ...completeData,
            date_of_birth: completeData.date_of_birth ? completeData.date_of_birth.toISOString().split('T')[0] : null,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      toast({
        title: "Profile setup complete!",
        description: "Welcome to your personalized health platform.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error setting up profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPricing = () => {
    handleOnboardingComplete();
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSkipStep = () => {
    setShowSkipDialog(true);
  };

  const saveDraft = async () => {
    if (!user || !Object.keys(formData).length) return;

    try {
      const dataToSave = {
        user_id: user.id,
        ...formData.step1,
        ...formData.step2,
        ...formData.step3,
        ...formData.step4,
      };

      await supabase
        .from("profiles")
        .upsert(
          {
            ...dataToSave,
            date_of_birth: dataToSave.date_of_birth ? dataToSave.date_of_birth.toISOString().split('T')[0] : null,
          },
          { onConflict: "user_id" }
        );

      toast({
        title: "Draft saved",
        description: "Your progress has been saved. You can continue later.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving draft",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      await saveDraft();
      navigate("/");
    } finally {
      setIsLoading(false);
      setShowSkipDialog(false);
    }
  };

  const handleSkipToHome = () => {
    setShowSkipDialog(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Your Health Journey</h1>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Step {currentStep} of {totalSteps}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipStep}
              className="text-muted-foreground hover:text-foreground"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Skip Step
            </Button>
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        <Card>
          <CardContent className="p-8">
            {currentStep === 1 && (
              <OnboardingStep1
                data={formData.step1 || {}}
                onNext={handleStep1Complete}
                onChange={(values) => setFormData(prev => ({ ...prev, step1: { ...prev.step1, ...values } as any }))}
              />
            )}

            {currentStep === 2 && (
              <OnboardingStep2
                data={formData.step2 || {}}
                onNext={handleStep2Complete}
                onBack={handleBack}
                onChange={(values) => setFormData(prev => ({ ...prev, step2: { ...prev.step2, ...values } as any }))}
              />
            )}

            {currentStep === 3 && (
              <OnboardingStep3
                data={formData.step3 || {}}
                onNext={handleStep3Complete}
                onBack={handleBack}
                onChange={(values) => setFormData(prev => ({ ...prev, step3: { ...prev.step3, ...values } as any }))}
              />
            )}

            {currentStep === 4 && (
              <OnboardingStep4
                data={formData.step4 || {}}
                onComplete={handleStep4Complete}
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}

            {currentStep === 5 && (
              <OnboardingStep5
                onNext={handleOnboardingComplete}
                onSkip={handleSkipPricing}
                onBack={handleBack}
              />
            )}
          </CardContent>
        </Card>

        <SkipDraftDialog
          isOpen={showSkipDialog}
          onClose={() => setShowSkipDialog(false)}
          onSaveDraft={handleSaveDraft}
          onSkip={handleSkipToHome}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}