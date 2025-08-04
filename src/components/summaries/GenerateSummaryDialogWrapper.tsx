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

  return (
    <GenerateSummaryDialog
      isOpen={isOpen}
      onClose={onClose}
      onGenerate={generateSummary}
      loading={loading}
      preSelectedReportIds={preSelectedReportIds}
    />
  );
}