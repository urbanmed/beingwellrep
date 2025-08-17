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

  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString(),
    };
  } catch (_) {
    // Fallback to browser geolocation
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout, enableHighAccuracy });
        });
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };
      } catch (err) {
        console.warn('Could not get location via browser fallback:', err);
      }
    }
  }
  return null;
}
