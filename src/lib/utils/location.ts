import { Geolocation } from '@capacitor/geolocation';
import { requestLocationPermission } from './ios-permissions';
import { isIOSPlatform } from './mobile';

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

  // For iOS, check permissions first
  if (isIOSPlatform()) {
    console.log('📍 iOS detected, checking permissions...');
    const permissionStatus = await requestLocationPermission();
    
    if (!permissionStatus.granted) {
      console.log('📍 Location permission not granted:', permissionStatus);
      if (permissionStatus.message) {
        // Show iOS-native alert about permission
        alert(permissionStatus.message);
      }
      return null;
    }
    console.log('📍 iOS location permission granted');
  }

  try {
    console.log('📍 Trying Capacitor Geolocation...');
    const position = await Geolocation.getCurrentPosition({ 
      enableHighAccuracy, 
      timeout: isIOSPlatform() ? timeout * 2 : timeout // Give iOS more time
    });
    console.log('📍 Capacitor location success:', position);
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString(),
    };
  } catch (capacitorError) {
    console.log('📍 Capacitor geolocation failed:', capacitorError);
    
    // For iOS, don't fallback to browser geolocation as it may not work properly
    if (isIOSPlatform()) {
      console.log('📍 iOS platform, not using browser fallback');
      return null;
    }
    
    // Fallback to browser geolocation for web
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
