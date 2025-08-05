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

interface DeleteSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  summaryTitle?: string;
}

export function DeleteSummaryDialog({
  isOpen,
  onClose,
  onConfirm,
  summaryTitle,
}: DeleteSummaryDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Summary?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{summaryTitle}"? This action cannot be undone and will permanently remove this AI-generated summary from your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Summary
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}