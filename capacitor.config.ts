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