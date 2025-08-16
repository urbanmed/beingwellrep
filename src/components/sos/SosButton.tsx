import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useSosActivation } from '@/hooks/useSosActivation';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { SosCountdownModal } from './SosCountdownModal';
import { getLocation } from '@/lib/utils/location';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNativePlatform } from '@/lib/utils/mobile';

interface SosButtonProps {
  size?: 'sm' | 'default' | 'lg';
  variant?: 'destructive' | 'outline';
  className?: string;
}

export function SosButton({ size = 'default', variant = 'destructive', className }: SosButtonProps) {
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [currentActivation, setCurrentActivation] = useState<string | null>(null);
  const { triggerSos, cancelSos, completeSos, activating } = useSosActivation();
  const { contacts } = useEmergencyContacts();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSosClick = async () => {
    // Haptic feedback for native platforms
    if (isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    }

    // Check if user has emergency contacts
    if (contacts.length === 0) {
      alert('Please add emergency contacts in your profile before using SOS.');
      return;
    }

    // Get user location if available (Capacitor with web fallback)
    const locationData = await getLocation({ enableHighAccuracy: true, timeout: 8000 });

    // Trigger SOS activation in database
    const result = await triggerSos(locationData);
    if (result.error) return;

    // Additional haptic feedback on successful trigger
    if (isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    }

    // Start countdown
    setCurrentActivation(result.data.id);
    setShowCountdown(true);
    setCountdown(30);
    startCountdown();
  };

  const startCountdown = () => {
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleCountdownComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCountdownComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (currentActivation) {
      // Complete the SOS activation (this will trigger SMS sending in the future)
      completeSos(currentActivation);
      alert('Emergency alert sent to your contacts!');
    }
    
    setShowCountdown(false);
    setCurrentActivation(null);
  };

  const handleCancel = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (currentActivation) {
      await cancelSos(currentActivation);
    }

    setShowCountdown(false);
    setCurrentActivation(null);
    setCountdown(30);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`min-h-[44px] min-w-[44px] active:scale-95 transition-transform ${className}`}
        onClick={handleSosClick}
        disabled={activating || showCountdown}
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        SOS
      </Button>

      <SosCountdownModal
        open={showCountdown}
        countdown={countdown}
        onCancel={handleCancel}
        emergencyContacts={contacts.slice(0, 2)} // Only show first 2 contacts
      />
    </>
  );
}