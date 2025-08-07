import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmergencyContacts, EmergencyContact } from '@/hooks/useEmergencyContacts';

interface EditEmergencyContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: EmergencyContact;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'neighbor', label: 'Neighbor' },
  { value: 'other', label: 'Other' },
];

export function EditEmergencyContactDialog({ 
  open, 
  onOpenChange, 
  contact 
}: EditEmergencyContactDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateContact } = useEmergencyContacts();

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        relationship: contact.relationship,
        phone_number: contact.phone_number,
      });
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.relationship || !formData.phone_number) {
      return;
    }

    setIsSubmitting(true);
    const result = await updateContact(contact.id, formData);
    
    if (!result?.error) {
      onOpenChange(false);
    }
    
    setIsSubmitting(false);
  };

  const handlePhoneChange = (value: string) => {
    // Remove any non-digit characters
    const phoneNumber = value.replace(/\D/g, '');
    // Limit to 10 digits
    if (phoneNumber.length <= 10) {
      setFormData(prev => ({ ...prev, phone_number: phoneNumber }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Emergency Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter contact name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship</Label>
            <Select 
              value={formData.relationship} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="Enter 10-digit phone number"
              maxLength={10}
              required
            />
            <div className="text-xs text-muted-foreground">
              Enter 10 digits only (e.g., 9876543210)
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}