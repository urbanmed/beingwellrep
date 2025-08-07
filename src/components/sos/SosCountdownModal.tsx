import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, X, Phone } from 'lucide-react';
import { EmergencyContact } from '@/hooks/useEmergencyContacts';

interface SosCountdownModalProps {
  open: boolean;
  countdown: number;
  onCancel: () => void;
  emergencyContacts: EmergencyContact[];
}

export function SosCountdownModal({ 
  open, 
  countdown, 
  onCancel, 
  emergencyContacts 
}: SosCountdownModalProps) {
  const progress = ((30 - countdown) / 30) * 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Emergency Alert Active
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Countdown Display */}
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-destructive tabular-nums">
              {countdown}
            </div>
            <p className="text-muted-foreground">
              Sending emergency alert in {countdown} seconds
            </p>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Emergency Contacts Info */}
          {emergencyContacts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Alert will be sent to:
              </h4>
              <div className="space-y-2">
                {emergencyContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-3 p-2 rounded-md bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {contact.relationship} • {contact.phone_number}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancel Button */}
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
            size="lg"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel Emergency Alert
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}