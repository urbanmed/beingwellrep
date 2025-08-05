import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Eye, Download, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { GenerateSummaryDialogWrapper } from '@/components/summaries/GenerateSummaryDialogWrapper';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useReports } from '@/hooks/useReports';

interface ReportActionsProps {
  reportId: string;
  ocrStatus: string;
  onView?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

export function ReportActions({ reportId, ocrStatus, onView, onDownload, onDelete }: ReportActionsProps) {
  const navigate = useNavigate();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteReport } = useReports();

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    if (onDelete) {
      onDelete();
    } else {
      await deleteReport(reportId);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/reports/${reportId}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View Report
          </DropdownMenuItem>
          
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
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <GenerateSummaryDialogWrapper
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        preSelectedReportIds={[reportId]}
      />
      
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}