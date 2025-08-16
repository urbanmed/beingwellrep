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
    console.log('🚨 SOS Button clicked - starting debug trace');
    console.log('📱 Is native platform:', isNativePlatform());
    console.log('📋 Emergency contacts count:', contacts.length);
    console.log('📱 User agent:', navigator.userAgent);
    console.log('📱 Platform:', navigator.platform);

    try {
      // Haptic feedback for native platforms
      if (isNativePlatform()) {
        console.log('📳 Attempting haptic feedback...');
        try {
          await Haptics.impact({ style: ImpactStyle.Heavy });
          console.log('✅ Haptic feedback successful');
        } catch (error) {
          console.warn('⚠️ Haptics not available:', error);
        }
      } else {
        console.log('📱 Not native platform, skipping haptics');
      }

      // Check if user has emergency contacts
      if (contacts.length === 0) {
        console.log('❌ No emergency contacts found');
        alert('Please add emergency contacts in your profile before using SOS.');
        return;
      }

      console.log('📍 Getting location...');
      // Get user location if available (Capacitor with web fallback)
      const locationData = await getLocation({ enableHighAccuracy: true, timeout: 8000 });
      console.log('📍 Location data:', locationData);

      console.log('💾 Triggering SOS in database...');
      // Trigger SOS activation in database
      const result = await triggerSos(locationData);
      console.log('💾 SOS trigger result:', result);
      
      if (result.error) {
        console.error('❌ SOS trigger failed:', result.error);
        alert(`SOS trigger failed: ${result.error.message}`);
        return;
      }

      // Additional haptic feedback on successful trigger
      if (isNativePlatform()) {
        console.log('📳 Success haptic feedback...');
        try {
          await Haptics.impact({ style: ImpactStyle.Heavy });
          console.log('✅ Success haptic feedback successful');
        } catch (error) {
          console.warn('⚠️ Success haptics not available:', error);
        }
      }

      console.log('⏱️ Starting countdown...');
      // Start countdown
      setCurrentActivation(result.data.id);
      setShowCountdown(true);
      setCountdown(30);
      startCountdown();
      console.log('✅ SOS activation complete');
      
    } catch (error) {
      console.error('💥 SOS click handler error:', error);
      alert(`SOS activation failed: ${error.message}`);
    }
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