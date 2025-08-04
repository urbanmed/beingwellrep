import { useState } from 'react';
import { Sparkles, Eye, Download, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GenerateSummaryDialogWrapper } from '@/components/summaries/GenerateSummaryDialogWrapper';

interface ReportActionsProps {
  reportId: string;
  ocrStatus: string;
  onView?: () => void;
  onDownload?: () => void;
}

export function ReportActions({ reportId, ocrStatus, onView, onDownload }: ReportActionsProps) {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onView && (
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              View Report
            </DropdownMenuItem>
          )}
          
          {ocrStatus === 'completed' && (
            <DropdownMenuItem onClick={() => setShowGenerateDialog(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Summary
            </DropdownMenuItem>
          )}
          
          {onDownload && (
            <DropdownMenuItem onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <GenerateSummaryDialogWrapper
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        preSelectedReportIds={[reportId]}
      />
    </>
  );
}