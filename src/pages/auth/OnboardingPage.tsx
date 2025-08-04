import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingStep1 } from "@/components/profile/OnboardingStep1";
import { OnboardingStep2 } from "@/components/profile/OnboardingStep2";
import { OnboardingStep3 } from "@/components/profile/OnboardingStep3";
import { OnboardingStep4 } from "@/components/profile/OnboardingStep4";
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
  const [formData, setFormData] = useState<{
    step1?: BasicInfoFormData;
    step2?: MedicalInfoFormData;
    step3?: EmergencyContactFormData;
    step4?: PrivacySettingsFormData;
  }>({});

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleStep1Complete = (data: BasicInfoFormData) => {
    setFormData(prev => ({ ...prev, step1: data }));
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: MedicalInfoFormData) => {
    setFormData(prev => ({ ...prev, step2: data }));
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: EmergencyContactFormData) => {
    setFormData(prev => ({ ...prev, step3: data }));
    setCurrentStep(4);
  };

  const handleOnboardingComplete = async (data: PrivacySettingsFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const completeData = {
        user_id: user.id,
        ...formData.step1,
        ...formData.step2,
        ...formData.step3,
        ...data,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert({
          ...completeData,
          date_of_birth: completeData.date_of_birth ? completeData.date_of_birth.toISOString().split('T')[0] : null,
        });

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

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Your Health Journey</h1>
          <p className="text-muted-foreground">Step {currentStep} of {totalSteps}</p>
        </div>

        <Progress value={progress} className="h-2" />

        <Card>
          <CardContent className="p-8">
            {currentStep === 1 && (
              <OnboardingStep1
                data={formData.step1 || {}}
                onNext={handleStep1Complete}
              />
            )}

            {currentStep === 2 && (
              <OnboardingStep2
                data={formData.step2 || {}}
                onNext={handleStep2Complete}
                onBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <OnboardingStep3
                data={formData.step3 || {}}
                onNext={handleStep3Complete}
                onBack={handleBack}
              />
            )}

            {currentStep === 4 && (
              <OnboardingStep4
                data={formData.step4 || {}}
                onComplete={handleOnboardingComplete}
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}