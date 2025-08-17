/**
 * iOS Build Configuration
 * Configuration settings and utilities for iOS deployment
 */

export const iOSBuildConfig = {
  // App Information
  bundleId: 'com.beingwell.app',
  appName: 'BeingWell',
  displayName: 'BeingWell',
  
  // Deployment Targets
  minimumOSVersion: '13.0',
  targetSDK: 'iphoneos',
  
  // Build Settings
  buildConfiguration: {
    development: {
      codeSignIdentity: 'iPhone Developer',
      provisioningProfile: 'automatic',
      debugMode: true,
    },
    production: {
      codeSignIdentity: 'iPhone Distribution',
      provisioningProfile: 'match AppStore',
      debugMode: false,
      bitcode: true,
    }
  },
  
  // Capacitor Configuration
  capacitorConfig: {
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
      webContentsDebuggingEnabled: false, // Set to false for production
      limitsNavigationsToAppBoundDomains: false
    }
  },
  
  // App Store Configuration
  appStore: {
    category: 'Medical',
    keywords: ['health', 'medical', 'reports', 'wellness', 'documents'],
    supportURL: 'https://beingwell.app/support',
    privacyURL: 'https://beingwell.app/privacy',
    marketingURL: 'https://beingwell.app',
    description: 'Your personal health companion for managing medical reports and wellness tracking.',
  },
  
  // Permissions and Capabilities
  permissions: {
    camera: 'This app uses the camera to scan medical documents and reports for your health vault.',
    photoLibrary: 'This app accesses your photo library to import medical documents and reports to your health vault.',
    location: 'This app needs location access to send your location during emergency SOS alerts to your emergency contacts.',
    microphone: 'This app may use the microphone for voice notes and health data entry.'
  }
};

export const getBuildCommand = (environment: 'development' | 'production') => {
  const config = iOSBuildConfig.buildConfiguration[environment];
  
  return {
    prebuild: [
      'npm run build',
      'npx cap sync ios'
    ],
    build: [
      'npx cap run ios',
      ...(environment === 'production' ? [
        'xcodebuild archive -workspace ios/App/App.xcworkspace -scheme App -archivePath build/App.xcarchive',
        'xcodebuild -exportArchive -archivePath build/App.xcarchive -exportPath build -exportOptionsPlist ios/ExportOptions.plist'
      ] : [])
    ]
  };
};