import { useState } from "react";
import { Upload, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFileConsistencyChecker } from "@/hooks/useFileConsistencyChecker";

interface FileRecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
  onReuploadNeeded: () => void;
}

export function FileRecoveryDialog({
  isOpen,
  onClose,
  reportId,
  reportTitle,
  onReuploadNeeded
}: FileRecoveryDialogProps) {
  const [isCheckingFile, setIsCheckingFile] = useState(false);
  const { markReportForReupload, isFixing } = useFileConsistencyChecker();

  const handleMarkForReupload = async () => {
    try {
      await markReportForReupload(reportId);
      onReuploadNeeded();
      onClose();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleRetryAccess = async () => {
    setIsCheckingFile(true);
    // Wait a moment then refresh the page to retry
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Document Access Issue
          </DialogTitle>
          <DialogDescription>
            The file for "{reportTitle}" cannot be accessed from storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              This usually happens when a file upload was interrupted or failed silently. 
              The document metadata is saved, but the actual file wasn't properly stored.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Recovery Options:</h4>
            
            <Button
              variant="outline"
              onClick={handleRetryAccess}
              disabled={isCheckingFile}
              className="w-full justify-start"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingFile ? 'animate-spin' : ''}`} />
              {isCheckingFile ? 'Retrying...' : 'Retry File Access'}
            </Button>

            <Button
              onClick={handleMarkForReupload}
              disabled={isFixing}
              className="w-full justify-start"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isFixing ? 'Preparing...' : 'Re-upload Document'}
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Note:</strong> Re-uploading will preserve the report metadata (title, date, etc.) 
              but will require you to upload the document file again.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}