import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface RecommendationPreferences {
  frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  preferred_specialties: string[];
  hide_dismissed: boolean;
  urgency_threshold: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  calendar_integration: boolean;
}

const defaultPreferences: RecommendationPreferences = {
  frequency: 'weekly',
  preferred_specialties: [],
  hide_dismissed: true,
  urgency_threshold: 'medium',
  calendar_integration: false,
};

export function useRecommendationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<RecommendationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPreferences(defaultPreferences);
      setLoading(false);
      return;
    }

    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("recommendation_preferences")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.recommendation_preferences) {
        setPreferences({ 
          ...defaultPreferences, 
          ...(data.recommendation_preferences as Partial<RecommendationPreferences>)
        });
      } else {
        setPreferences(defaultPreferences);
      }
    } catch (error) {
      console.error("Error fetching recommendation preferences:", error);
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<RecommendationPreferences>) => {
    if (!user) return;

    const updatedPreferences = { ...preferences, ...newPreferences };

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          recommendation_preferences: updatedPreferences,
        });

      if (error) throw error;

      setPreferences(updatedPreferences);
      
      toast({
        title: "Preferences updated",
        description: "Your recommendation preferences have been saved.",
      });
    } catch (error) {
      console.error("Error updating recommendation preferences:", error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    preferences,
    loading,
    updatePreferences,
    refetch: fetchPreferences,
  };
}