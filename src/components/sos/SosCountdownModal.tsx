import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, X, Phone } from 'lucide-react';
import { EmergencyContact } from '@/hooks/useEmergencyContacts';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  const CountdownContent = () => (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Countdown Display */}
      <div className="text-center space-y-4">
        <div className="text-6xl sm:text-7xl font-bold text-destructive tabular-nums">
          {countdown}
        </div>
        <p className="text-muted-foreground text-base sm:text-lg">
          Sending emergency alert in {countdown} seconds
        </p>
        <Progress value={progress} className="w-full h-3" />
      </div>

      {/* Emergency Contacts Info */}
      {emergencyContacts.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            Alert will be sent to:
          </h4>
          <div className="space-y-2">
            {emergencyContacts.map((contact) => (
              <div key={contact.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 min-h-[44px]">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{contact.name}</div>
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
        className="w-full min-h-[48px] text-base font-semibold active:scale-95 transition-transform"
        size="lg"
      >
        <X className="h-5 w-5 mr-2" />
        Cancel Emergency Alert
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={() => {}}>
        <DrawerContent className="pb-safe">
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center text-destructive">
              <AlertTriangle className="h-6 w-6 mr-2" />
              Emergency Alert Active
            </DrawerTitle>
          </DrawerHeader>
          <CountdownContent />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Emergency Alert Active
          </DialogTitle>
        </DialogHeader>
        <CountdownContent />
      </DialogContent>
    </Dialog>
  );
}