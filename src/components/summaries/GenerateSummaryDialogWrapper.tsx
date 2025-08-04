import { useMemo } from 'react';
import { GenerateSummaryDialog } from './GenerateSummaryDialog';
import { useSummaries } from '@/hooks/useSummaries';

interface GenerateSummaryDialogWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedReportIds?: string[];
}

export function GenerateSummaryDialogWrapper({ 
  isOpen, 
  onClose, 
  preSelectedReportIds 
}: GenerateSummaryDialogWrapperProps) {
  const { generateSummary, loading } = useSummaries();

  // Memoize preSelectedReportIds to prevent unnecessary re-renders
  const memoizedPreSelectedReportIds = useMemo(() => {
    return preSelectedReportIds || [];
  }, [preSelectedReportIds]);

  return (
    <GenerateSummaryDialog
      isOpen={isOpen}
      onClose={onClose}
      onGenerate={generateSummary}
      loading={loading}
      preSelectedReportIds={memoizedPreSelectedReportIds}
    />
  );
}