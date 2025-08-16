import { Geolocation } from '@capacitor/geolocation';
import { isIOSPlatform } from './mobile';

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  restricted: boolean;
  message?: string;
}

export async function requestLocationPermission(): Promise<PermissionStatus> {
  if (!isIOSPlatform()) {
    console.log('📍 Not iOS platform, skipping permission request');
    return { granted: true, denied: false, restricted: false };
  }

  try {
    console.log('📍 Requesting location permissions on iOS...');
    
    // Check current permissions
    const permissions = await Geolocation.checkPermissions();
    console.log('📍 Current permissions:', permissions);
    
    if (permissions.location === 'granted') {
      return { granted: true, denied: false, restricted: false };
    }
    
    if (permissions.location === 'denied') {
      return {
        granted: false,
        denied: true,
        restricted: false,
        message: 'Location permission was denied. Please enable it in Settings > Privacy & Security > Location Services.'
      };
    }
    
    // Request permissions if not determined
    const requestResult = await Geolocation.requestPermissions();
    console.log('📍 Permission request result:', requestResult);
    
    if (requestResult.location === 'granted') {
      return { granted: true, denied: false, restricted: false };
    }
    
    if (requestResult.location === 'denied') {
      return {
        granted: false,
        denied: true,
        restricted: false,
        message: 'Location permission was denied. For emergency features to work, please enable location access in Settings.'
      };
    }
    
    return {
      granted: false,
      denied: false,
      restricted: true,
      message: 'Location access is restricted. Please check your device settings.'
    };
    
  } catch (error) {
    console.error('📍 Error requesting location permission:', error);
    return {
      granted: false,
      denied: true,
      restricted: false,
      message: 'Unable to request location permission. Please check your device settings.'
    };
  }
}

export async function showIOSNativeAlert(title: string, message: string): Promise<void> {
  if (!isIOSPlatform()) {
    // Fallback to regular alert for web
    alert(`${title}: ${message}`);
    return;
  }
  
  try {
    // For iOS, we'll use a more native-looking approach
    // In a real app, you'd import AlertController from @capacitor/dialog
    // For now, we'll use the enhanced alert with better styling
    const confirmed = confirm(`${title}\n\n${message}`);
    console.log('📱 iOS alert shown:', { title, message, confirmed });
  } catch (error) {
    console.error('📱 Error showing iOS alert:', error);
    alert(`${title}: ${message}`);
  }
}