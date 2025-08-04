import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileCompletionStatus {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
  completedSections: {
    basicInfo: boolean;
    medicalInfo: boolean;
    emergencyContact: boolean;
    privacySettings: boolean;
  };
}

export function useProfileCompletion() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ProfileCompletionStatus>({
    isComplete: false,
    completionPercentage: 0,
    missingFields: [],
    completedSections: {
      basicInfo: false,
      medicalInfo: false,
      emergencyContact: false,
      privacySettings: false,
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  const checkProfileCompletion = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!profile) {
          setStatus({
            isComplete: false,
            completionPercentage: 0,
            missingFields: ["All profile information"],
            completedSections: {
              basicInfo: false,
              medicalInfo: false,
              emergencyContact: false,
              privacySettings: false,
            },
          });
          setIsLoading(false);
          return;
        }

        const missingFields: string[] = [];
        const completedSections = {
          basicInfo: false,
          medicalInfo: false,
          emergencyContact: false,
          privacySettings: false,
        };

        // Check basic info
        const basicInfoFields = ["first_name", "last_name", "date_of_birth", "gender", "phone_number", "address"];
        const basicInfoComplete = basicInfoFields.every(field => profile[field]);
        completedSections.basicInfo = basicInfoComplete;
        if (!basicInfoComplete) {
          basicInfoFields.forEach(field => {
            if (!profile[field]) missingFields.push(field.replace("_", " "));
          });
        }

        // Check emergency contact
        const emergencyFields = ["emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship"];
        const emergencyComplete = emergencyFields.every(field => profile[field]);
        completedSections.emergencyContact = emergencyComplete;
        if (!emergencyComplete) {
          emergencyFields.forEach(field => {
            if (!profile[field]) missingFields.push(field.replace("emergency_contact_", "emergency ").replace("_", " "));
          });
        }

        // Check privacy settings
        const hasPrivacySettings = Boolean(profile.privacy_settings && profile.notification_preferences);
        completedSections.privacySettings = hasPrivacySettings;
        if (!hasPrivacySettings) {
          missingFields.push("privacy settings");
        }

        // Medical info is optional but counts toward completion
        const hasMedicalInfo = Boolean(profile.insurance_provider || profile.physician_name);
        completedSections.medicalInfo = hasMedicalInfo;

        const completedSectionCount = Object.values(completedSections).filter(Boolean).length;
        const totalRequiredSections = 3; // Basic, Emergency, Privacy (Medical is optional)
        const completionPercentage = Math.round((completedSectionCount / 4) * 100); // Include medical for better UX
        const isComplete = completedSectionCount >= totalRequiredSections;

        setStatus({
          isComplete,
          completionPercentage,
          missingFields,
          completedSections,
        });
      } catch (error) {
        console.error("Error checking profile completion:", error);
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    checkProfileCompletion();
  }, [user]);

  const refreshStatus = () => {
    checkProfileCompletion();
  };

  return { status, isLoading, refreshStatus };
}