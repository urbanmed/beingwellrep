import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beingwell.app',
  appName: 'BeingWell',
  webDir: 'dist',
  server: {
    url: 'https://19c2bff5-5cc9-411b-b7e2-36bbe14692c6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Geolocation: {
      permissions: ['location'],
      requestPermissions: true,
      accuracy: 'high'
    },
    Haptics: {
      vibrationIntensity: 'medium'
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#FFFFFF',
      overlay: false
    },
    Keyboard: {
      resize: 'body',
      style: 'light',
      resizeOnFullScreen: true
    }
  },
  ios: {
    contentInset: 'never',
    allowsLinkPreview: false,
    backgroundColor: '#FFFFFF',
    overrideUserInterfaceStyle: 'light',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    allowInlineMediaPlayback: true,
    webContentsDebuggingEnabled: false, // Disabled for production
    limitsNavigationsToAppBoundDomains: false,
    handleApplicationURL: false,
    // iOS-specific WebView configuration
    scheme: 'capacitor',
    hostname: 'localhost'
  }
};

export default config;