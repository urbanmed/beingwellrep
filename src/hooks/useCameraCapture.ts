import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useToast } from '@/hooks/use-toast';
import { isNativePlatform } from '@/lib/utils/mobile';

export function useCameraCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();

  const capturePhoto = async (): Promise<File | null> => {
    if (!isNativePlatform()) {
      toast({
        title: 'Camera not available',
        description: 'Camera functionality is only available on mobile devices',
        variant: 'destructive',
      });
      return null;
    }

    setIsCapturing(true);

    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
      });

      if (image.dataUrl) {
        // Convert data URL to File object
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const fileName = `photo_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        return file;
      }

      return null;
    } catch (error) {
      console.error('Camera capture error:', error);
      toast({
        title: 'Camera error',
        description: 'Failed to capture photo. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  return {
    capturePhoto,
    isCapturing,
  };
}