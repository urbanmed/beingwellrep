import { Geolocation } from '@capacitor/geolocation';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: string;
}

export async function getLocation(options?: { timeout?: number; enableHighAccuracy?: boolean }): Promise<LocationData | null> {
  const timeout = options?.timeout ?? 8000;
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;

  console.log('📍 Getting location with options:', { timeout, enableHighAccuracy });

  try {
    console.log('📍 Trying Capacitor Geolocation...');
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
    console.log('📍 Capacitor location success:', position);
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString(),
    };
  } catch (capacitorError) {
    console.log('📍 Capacitor geolocation failed:', capacitorError);
    
    // Fallback to browser geolocation
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        console.log('📍 Trying browser geolocation fallback...');
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout, enableHighAccuracy });
        });
        console.log('📍 Browser location success:', position);
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };
      } catch (browserError) {
        console.warn('📍 Browser geolocation failed:', browserError);
      }
    } else {
      console.warn('📍 Navigator.geolocation not available');
    }
  }
  
  console.log('📍 All location methods failed, returning null');
  return null;
}
