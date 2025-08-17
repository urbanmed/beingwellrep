import { Geolocation } from '@capacitor/geolocation';
import { isIOSPlatform } from './mobile';

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  restricted: boolean;
  message?: string;
}

export async function requestLocationPermission(): Promise<PermissionStatus> {
  // For all platforms except native iOS, assume granted
  if (!isIOSPlatform()) {
    console.log('📍 Not iOS platform, permissions assumed granted');
    return { granted: true, denied: false, restricted: false };
  }

  try {
    console.log('📍 Requesting location permissions on iOS...');
    
    // Check current permissions first
    const permissions = await Geolocation.checkPermissions();
    console.log('📍 Current permissions:', permissions);
    
    if (permissions.location === 'granted') {
      console.log('✅ Location permission already granted');
      return { granted: true, denied: false, restricted: false };
    }
    
    if (permissions.location === 'denied') {
      console.log('❌ Location permission previously denied');
      return {
        granted: false,
        denied: true,
        restricted: false,
        message: 'Location access denied. To use emergency features, go to Settings > BeingWell > Location and select "While Using App".'
      };
    }
    
    // For prompt-able states, request permissions
    if (permissions.location === 'prompt' || permissions.location === 'prompt-with-rationale') {
      console.log('📱 Requesting location permissions...');
      const requestResult = await Geolocation.requestPermissions();
      console.log('📍 Permission request result:', requestResult);
      
      if (requestResult.location === 'granted') {
        console.log('✅ Location permission granted after request');
        return { granted: true, denied: false, restricted: false };
      }
      
      if (requestResult.location === 'denied') {
        console.log('❌ Location permission denied after request');
        return {
          granted: false,
          denied: true,
          restricted: false,
          message: 'Location access is required for emergency features. Please enable it in your device settings.'
        };
      }
    }
    
    // Handle other cases
    console.log('⚠️ Location permission in unexpected state:', permissions.location);
    return {
      granted: false,
      denied: false,
      restricted: true,
      message: 'Location access status unclear. Please check your device settings if emergency features don\'t work.'
    };
    
  } catch (error) {
    console.error('📍 Error requesting location permission:', error);
    // On iOS simulator, permissions might fail but location might still work
    console.log('🔧 Permission check failed, attempting fallback...');
    return {
      granted: false,
      denied: false,
      restricted: false,
      message: 'Could not verify location permissions. Emergency features may still work.'
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