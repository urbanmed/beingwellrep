import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useEmergencyContacts, EmergencyContact } from '@/hooks/useEmergencyContacts';

interface DeleteEmergencyContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: EmergencyContact;
}

export function DeleteEmergencyContactDialog({ 
  open, 
  onOpenChange, 
  contact 
}: DeleteEmergencyContactDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteContact } = useEmergencyContacts();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteContact(contact.id);
    
    if (!result?.error) {
      onOpenChange(false);
    }
    
    setIsDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Delete Emergency Contact
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this emergency contact? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="font-medium">{contact.name}</div>
            <div className="text-sm text-muted-foreground">
              {contact.relationship} • {contact.phone_number}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Contact'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}