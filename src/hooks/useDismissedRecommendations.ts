import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DismissedRecommendation {
  id: string;
  user_id: string;
  recommendation_type: string;
  recommendation_key: string;
  dismissed_at: string;
  expires_at?: string;
  reason?: string;
}

export function useDismissedRecommendations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dismissedItems, setDismissedItems] = useState<DismissedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setDismissedItems([]);
      setLoading(false);
      return;
    }

    fetchDismissedRecommendations();
  }, [user]);

  const fetchDismissedRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from("dismissed_recommendations")
        .select("*")
        .eq("user_id", user?.id)
        .or("expires_at.is.null,expires_at.gt.now()");

      if (error) throw error;
      setDismissedItems(data || []);
    } catch (error) {
      console.error("Error fetching dismissed recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const dismissRecommendation = async (
    type: string,
    key: string,
    reason?: string,
    expiresInDays?: number
  ) => {
    if (!user) return;

    try {
      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const { error } = await supabase
        .from("dismissed_recommendations")
        .upsert({
          user_id: user.id,
          recommendation_type: type,
          recommendation_key: key,
          reason,
          expires_at: expiresAt,
        });

      if (error) throw error;

      await fetchDismissedRecommendations();
      
      toast({
        title: "Recommendation dismissed",
        description: expiresInDays 
          ? `This recommendation will be hidden for ${expiresInDays} days.`
          : "This recommendation has been permanently dismissed.",
      });
    } catch (error) {
      console.error("Error dismissing recommendation:", error);
      toast({
        title: "Error",
        description: "Failed to dismiss recommendation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const undismissRecommendation = async (type: string, key: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("dismissed_recommendations")
        .delete()
        .eq("user_id", user.id)
        .eq("recommendation_type", type)
        .eq("recommendation_key", key);

      if (error) throw error;

      await fetchDismissedRecommendations();
      
      toast({
        title: "Recommendation restored",
        description: "This recommendation will now be shown again.",
      });
    } catch (error) {
      console.error("Error undismissing recommendation:", error);
      toast({
        title: "Error",
        description: "Failed to restore recommendation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isDismissed = (type: string, key: string) => {
    return dismissedItems.some(
      item => item.recommendation_type === type && item.recommendation_key === key
    );
  };

  return {
    dismissedItems,
    loading,
    dismissRecommendation,
    undismissRecommendation,
    isDismissed,
    refetch: fetchDismissedRecommendations,
  };
}