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

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isMultiple?: boolean;
  count?: number;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isMultiple = false,
  count = 1,
}: DeleteConfirmDialogProps) {
  const defaultTitle = isMultiple 
    ? `Delete ${count} Report${count > 1 ? 's' : ''}?`
    : "Delete Report?";
  
  const defaultDescription = isMultiple
    ? `Are you sure you want to delete ${count} report${count > 1 ? 's' : ''}? This action cannot be undone and will also remove the associated file${count > 1 ? 's' : ''} from storage.`
    : "Are you sure you want to delete this report? This action cannot be undone and will also remove the associated file from storage.";

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || defaultTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}