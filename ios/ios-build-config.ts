// iOS Build Configuration
// This file contains the build settings for the iOS app

export const iosBuildConfig = {
  // Deployment Target
  IPHONEOS_DEPLOYMENT_TARGET: "13.0",
  
  // App Information
  PRODUCT_NAME: "BeingWell",
  PRODUCT_BUNDLE_IDENTIFIER: "com.beingwell.app",
  MARKETING_VERSION: "1.0.0",
  CURRENT_PROJECT_VERSION: "1",
  
  // Build Settings
  DEVELOPMENT_TEAM: "", // Set this to your Apple Developer Team ID
  CODE_SIGN_STYLE: "Automatic",
  CODE_SIGN_IDENTITY: "iPhone Developer",
  
  // Swift/iOS Settings
  SWIFT_VERSION: "5.0",
  TARGETED_DEVICE_FAMILY: "1,2", // iPhone and iPad
  SUPPORTS_MACCATALYST: false,
  
  // Capabilities
  BACKGROUND_MODES: [
    "background-fetch",
    "background-processing"
  ],
  
  // Privacy and Security
  NSCameraUsageDescription: "This app uses the camera to scan medical documents and reports for your health vault.",
  NSPhotoLibraryUsageDescription: "This app accesses your photo library to import medical documents and reports to your health vault.",
  NSLocationWhenInUseUsageDescription: "This app needs location access to send your location during emergency SOS alerts to your emergency contacts.",
  NSMicrophoneUsageDescription: "This app may use the microphone for voice notes and health data entry.",
  
  // Network Security
  NSAppTransportSecurity: {
    NSAllowsArbitraryLoads: true,
    NSAllowsLocalNetworking: true,
    NSExceptionDomains: {
      "localhost": {
        NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
        NSTemporaryExceptionMinimumTLSVersion: "1.0",
        NSTemporaryExceptionRequiresForwardSecrecy: false
      }
    }
  },
  
  // Launch Screen
  UILaunchStoryboardName: "LaunchScreen",
  UILaunchScreen: {
    UIColorName: "AccentColor",
    UIImageName: "",
    UILaunchScreenMininumTime: 0.5
  },
  
  // Status Bar
  UIStatusBarStyle: "UIStatusBarStyleLightContent",
  UIStatusBarHidden: false,
  UIViewControllerBasedStatusBarAppearance: true,
  
  // Interface Orientation
  UISupportedInterfaceOrientations: ["UIInterfaceOrientationPortrait"],
  UISupportedInterfaceOrientations_iPad: [
    "UIInterfaceOrientationPortrait",
    "UIInterfaceOrientationPortraitUpsideDown",
    "UIInterfaceOrientationLandscapeLeft",
    "UIInterfaceOrientationLandscapeRight"
  ],
  
  // Device Capabilities
  UIRequiredDeviceCapabilities: ["armv7", "arm64"],
  
  // Scene Configuration
  UIApplicationSceneManifest: {
    UIApplicationSupportsMultipleScenes: false,
    UISceneConfigurations: {
      UIWindowSceneSessionRoleApplication: [
        {
          UISceneConfigurationName: "Default Configuration",
          UISceneDelegateClassName: "SceneDelegate"
        }
      ]
    }
  }
};

// Build phases configuration
export const iosBuildPhases = {
  // Script phases for Capacitor
  "Run Capacitor": {
    script: "cd $CAPACITOR_CLI_DIRECTORY && npx cap sync ios",
    inputFiles: ["$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)"],
    outputFiles: []
  },
  
  // Copy Bundle Resources
  copyBundleResources: [
    "public/**/*",
    "dist/**/*"
  ],
  
  // Compile Sources
  compileSources: [
    "App/**/*.swift",
    "App/**/*.m"
  ]
};