import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FHIRHealthReport {
  healthStatus: 'healthy' | 'warning' | 'critical';
  reportStatistics: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    fhirCoverageRate: number;
    completedWithFHIR: number;
    completedWithoutFHIR: number;
  };
  reportTypeBreakdown: Record<string, {
    total: number;
    completed: number;
    withFHIR: number;
  }>;
  fhirResourceCounts: {
    patients: number;
    observations: number;
    medicationRequests: number;
    diagnosticReports: number;
  };
  issues: Array<{
    severity: 'error' | 'warning';
    message: string;
  }>;
  problematicReports: Array<{
    id: string;
    title: string;
    report_type: string;
    created_at: string;
  }>;
  recommendations: Array<{
    action: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface BackfillResult {
  success: boolean;
  totalReportsChecked: number;
  reportsNeedingBackfill: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  message: string;
}

export const useFHIRHealthCheck = () => {
  const [loading, setLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const { toast } = useToast();

  const runHealthCheck = async (days: number = 7): Promise<FHIRHealthReport | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fhir-health-check', {
        body: { days }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "FHIR Health Check Complete",
        description: `Status: ${data.healthStatus} | Coverage: ${data.reportStatistics.fhirCoverageRate}%`,
        variant: data.healthStatus === 'critical' ? 'destructive' : 'default'
      });

      return data;
    } catch (error) {
      console.error('FHIR health check failed:', error);
      toast({
        title: "Health Check Failed",
        description: error.message || 'Failed to run FHIR health check',
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const runBackfill = async (batchSize: number = 50, userId?: string): Promise<BackfillResult | null> => {
    setBackfillLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-fhir-backfill', {
        body: { batchSize, userId }
      });

      if (error) {
        throw error;
      }

      const isSuccess = data.successCount > 0 || data.reportsNeedingBackfill === 0;
      
      toast({
        title: isSuccess ? "FHIR Backfill Complete" : "Backfill Issues",
        description: data.message,
        variant: data.errorCount > 0 ? 'destructive' : 'default'
      });

      return data;
    } catch (error) {
      console.error('FHIR backfill failed:', error);
      toast({
        title: "Backfill Failed", 
        description: error.message || 'Failed to run FHIR backfill',
        variant: "destructive"
      });
      return null;
    } finally {
      setBackfillLoading(false);
    }
  };

  const checkReportFHIRStatus = async (reportId: string) => {
    try {
      // Check if report has any FHIR resources
      const [observations, medicationRequests, diagnosticReports] = await Promise.all([
        supabase.from('fhir_observations').select('id').eq('source_report_id', reportId),
        supabase.from('fhir_medication_requests').select('id').eq('source_report_id', reportId), 
        supabase.from('fhir_diagnostic_reports').select('id').eq('source_report_id', reportId)
      ]);

      return {
        hasObservations: (observations.data?.length || 0) > 0,
        hasMedicationRequests: (medicationRequests.data?.length || 0) > 0,
        hasDiagnosticReports: (diagnosticReports.data?.length || 0) > 0,
        totalFHIRResources: (observations.data?.length || 0) + 
                           (medicationRequests.data?.length || 0) + 
                           (diagnosticReports.data?.length || 0)
      };
    } catch (error) {
      console.error('Failed to check report FHIR status:', error);
      return null;
    }
  };

  return {
    runHealthCheck,
    runBackfill,
    checkReportFHIRStatus,
    loading,
    backfillLoading
  };
};