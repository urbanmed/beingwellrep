import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Summary } from "@/types/summary";

export function useSummaries(familyMemberId?: string | null) {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      // First get reports for the selected family member to filter summaries
      let reportsQuery = supabase.from('reports').select('id');
      
      if (familyMemberId === null || familyMemberId === undefined) {
        reportsQuery = reportsQuery.is('family_member_id', null);
      } else {
        reportsQuery = reportsQuery.eq('family_member_id', familyMemberId);
      }

      const { data: reportsData, error: reportsError } = await reportsQuery;
      if (reportsError) throw reportsError;

      const reportIds = reportsData?.map(r => r.id) || [];

      // Then get summaries that reference these reports
      let summariesQuery = supabase
        .from('summaries')
        .select('*');

      if (reportIds.length > 0) {
        // Filter summaries that have source_report_ids overlapping with our filtered reports
        summariesQuery = summariesQuery.overlaps('source_report_ids', reportIds);
      } else {
        // No reports for this family member, so no summaries either
        summariesQuery = summariesQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
      }

      const { data, error } = await summariesQuery.order('generated_at', { ascending: false });

      if (error) throw error;
      setSummaries((data || []) as Summary[]);
    } catch (error) {
      console.error('Error fetching summaries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch summaries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (
    reportIds: string[], 
    summaryType: Summary['summary_type'],
    customPrompt?: string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          reportIds,
          summaryType,
          customPrompt
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI summary generated successfully",
      });

      // Refresh summaries list
      await fetchSummaries();
      
      return data.summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      const errorMessage = error.message || "Failed to generate summary";
      
      // Provide more specific error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('OCR text')) {
        userFriendlyMessage = "Some selected reports haven't finished processing yet. Please wait for OCR processing to complete.";
      } else if (errorMessage.includes('Edge Function returned a non-2xx status code')) {
        userFriendlyMessage = "There was an issue processing your request. Please try again.";
      }
      
      toast({
        title: "Error",
        description: userFriendlyMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const pinSummary = async (summaryId: string) => {
    try {
      const summary = summaries.find(s => s.id === summaryId);
      if (!summary) return;

      const { error } = await supabase
        .from('summaries')
        .update({ is_pinned: !summary.is_pinned })
        .eq('id', summaryId);

      if (error) throw error;

      setSummaries(prev => 
        prev.map(s => 
          s.id === summaryId 
            ? { ...s, is_pinned: !s.is_pinned }
            : s
        )
      );

      toast({
        title: "Success",
        description: `Summary ${summary.is_pinned ? 'unpinned' : 'pinned'}`,
      });
    } catch (error) {
      console.error('Error pinning summary:', error);
      toast({
        title: "Error",
        description: "Failed to update summary",
        variant: "destructive",
      });
    }
  };

  const deleteSummary = async (summaryId: string) => {
    try {
      const { error } = await supabase
        .from('summaries')
        .delete()
        .eq('id', summaryId);

      if (error) throw error;

      setSummaries(prev => prev.filter(s => s.id !== summaryId));
      
      toast({
        title: "Success",
        description: "Summary deleted",
      });
    } catch (error) {
      console.error('Error deleting summary:', error);
      toast({
        title: "Error",
        description: "Failed to delete summary",
        variant: "destructive",
      });
    }
  };

  const rateSummary = async (summaryId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('summaries')
        .update({ user_rating: rating })
        .eq('id', summaryId);

      if (error) throw error;

      setSummaries(prev => 
        prev.map(s => 
          s.id === summaryId 
            ? { ...s, user_rating: rating }
            : s
        )
      );

      toast({
        title: "Success",
        description: "Rating saved",
      });
    } catch (error) {
      console.error('Error rating summary:', error);
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [familyMemberId]);

  return {
    summaries,
    loading,
    generateSummary,
    pinSummary,
    deleteSummary,
    rateSummary,
    refetch: fetchSummaries
  };
}