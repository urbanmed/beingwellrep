import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beingwell.app',
  appName: 'BeingWell',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      permissions: ['location'],
      requestPermissions: true
    },
    Haptics: {
      vibrationIntensity: 'medium'
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#FFFFFF',
      overlay: false
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
    webContentsDebuggingEnabled: true,
    limitsNavigationsToAppBoundDomains: false
  },
  // Remove server config for native app deployment
  // server: {
  //   url: 'https://19c2bff5-5cc9-411b-b7e2-36bbe14692c6.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
};

export default config;