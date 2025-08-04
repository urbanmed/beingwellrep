import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Save, SkipForward } from "lucide-react";

interface SkipDraftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDraft: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function SkipDraftDialog({ 
  isOpen, 
  onClose, 
  onSaveDraft, 
  onSkip, 
  isLoading = false 
}: SkipDraftDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save Your Progress?</AlertDialogTitle>
          <AlertDialogDescription>
            You can save your current progress as a draft and complete your profile later, 
            or skip this step entirely. Your information is important for personalized health insights.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={onSaveDraft}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              variant="ghost" 
              onClick={onSkip}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip for Now
            </Button>
          </div>
          <AlertDialogCancel disabled={isLoading}>Continue Editing</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}