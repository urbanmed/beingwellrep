import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MedicalDataStats {
  reportsProcessed: number;
  dataQualityScore: number;
  aiAccuracy: number;
  validationErrors: number;
  recentProcessing: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    confidence?: number;
    created_at: string;
  }>;
}

export const useMedicalData = () => {
  const [stats, setStats] = useState<MedicalDataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMedicalDataStats = async () => {
    try {
      setLoading(true);

      // Fetch total reports processed
      const { count: reportsProcessed } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true });

      // Fetch recent processing results
      const { data: recentReports } = await supabase
        .from('reports')
        .select('id, title, report_type, parsing_status, parsing_confidence, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate data quality metrics
      const { data: allReports } = await supabase
        .from('reports')
        .select('parsing_confidence, parsing_status, extraction_confidence');

      let dataQualityScore = 0;
      let aiAccuracy = 0;
      let validationErrors = 0;

      if (allReports && allReports.length > 0) {
        // Calculate average confidence scores
        const confidenceScores = allReports
          .filter(report => report.parsing_confidence !== null)
          .map(report => Number(report.parsing_confidence));
        
        const extractionScores = allReports
          .filter(report => report.extraction_confidence !== null)
          .map(report => Number(report.extraction_confidence));

        if (confidenceScores.length > 0) {
          aiAccuracy = Math.round(confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length * 100);
        }

        if (extractionScores.length > 0) {
          dataQualityScore = Math.round(extractionScores.reduce((sum, score) => sum + score, 0) / extractionScores.length * 100);
        }

        // Count validation errors (reports with failed status or low confidence)
        validationErrors = allReports.filter(report => 
          report.parsing_status === 'failed' || 
          (report.parsing_confidence !== null && Number(report.parsing_confidence) < 0.7)
        ).length;
      }

      // Transform recent reports data
      const recentProcessing = recentReports?.map(report => ({
        id: report.id,
        title: report.title || 'Untitled Report',
        type: report.report_type || 'general',
        status: report.parsing_status || 'pending',
        confidence: report.parsing_confidence ? Math.round(Number(report.parsing_confidence) * 100) : undefined,
        created_at: report.created_at,
      })) || [];

      setStats({
        reportsProcessed: reportsProcessed || 0,
        dataQualityScore,
        aiAccuracy,
        validationErrors,
        recentProcessing,
      });
    } catch (error) {
      console.error('Error fetching medical data stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medical data statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicalDataStats();

    // Set up real-time subscription for reports updates
    const channel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports'
        },
        () => {
          fetchMedicalDataStats(); // Refresh stats when reports change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    stats,
    loading,
    fetchMedicalDataStats,
  };
};