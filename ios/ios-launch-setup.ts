// iOS Launch Configuration
// Instructions for setting up iOS app icons and launch screen

export const iOSLaunchSetup = {
  appIcon: {
    source: "/lovable-uploads/62e37d74-1210-43f7-acb4-21ffaa3c1aaa.png",
    sizes: [
      { name: "AppIcon-20x20@1x.png", size: "20x20" },
      { name: "AppIcon-20x20@2x.png", size: "40x40" },
      { name: "AppIcon-20x20@3x.png", size: "60x60" },
      { name: "AppIcon-29x29@1x.png", size: "29x29" },
      { name: "AppIcon-29x29@2x.png", size: "58x58" },
      { name: "AppIcon-29x29@3x.png", size: "87x87" },
      { name: "AppIcon-40x40@1x.png", size: "40x40" },
      { name: "AppIcon-40x40@2x.png", size: "80x80" },
      { name: "AppIcon-40x40@3x.png", size: "120x120" },
      { name: "AppIcon-60x60@2x.png", size: "120x120" },
      { name: "AppIcon-60x60@3x.png", size: "180x180" },
      { name: "AppIcon-76x76@1x.png", size: "76x76" },
      { name: "AppIcon-76x76@2x.png", size: "152x152" },
      { name: "AppIcon-83.5x83.5@2x.png", size: "167x167" },
      { name: "AppIcon-1024x1024@1x.png", size: "1024x1024" }
    ],
    instructions: `
      To set up app icons:
      1. Use the BeingWell logo from /lovable-uploads/62e37d74-1210-43f7-acb4-21ffaa3c1aaa.png
      2. Generate all required sizes using an icon generator tool
      3. Place the generated icons in ios/App/App/Assets.xcassets/AppIcon.appiconset/
      4. The Contents.json file is already configured for all required sizes
    `
  },
  
  launchScreen: {
    storyboard: "ios/App/App/Base.lproj/LaunchScreen.storyboard",
    configuration: {
      backgroundColor: "systemBackgroundColor",
      logo: "AppIcon",
      title: "BeingWell",
      subtitle: "Your Health, Simplified",
      accentColor: "AccentColor"
    },
    instructions: `
      Launch screen is configured with:
      - Centered app icon (100x100)
      - App name "BeingWell" below the icon
      - Subtitle "Your Health, Simplified"
      - System background color for light/dark mode support
      - Safe area constraints for proper display on all devices
    `
  },
  
  buildSettings: {
    deploymentTarget: "13.0",
    swiftVersion: "5.0",
    bundleIdentifier: "com.beingwell.app",
    teamId: "SET_YOUR_APPLE_DEVELOPER_TEAM_ID",
    codeSignStyle: "Automatic"
  }
};

// Post-setup instructions
export const postSetupInstructions = `
After completing the iOS configuration:

1. Copy app icons:
   - Resize /lovable-uploads/62e37d74-1210-43f7-acb4-21ffaa3c1aaa.png to all required sizes
   - Place them in ios/App/App/Assets.xcassets/AppIcon.appiconset/

2. Set up your Apple Developer account:
   - Open the project in Xcode
   - Set your Team ID in the project settings
   - Configure code signing

3. Test the configuration:
   - Run 'npx cap sync ios'
   - Open the project in Xcode
   - Build and run on simulator or device

4. Verify launch screen:
   - Check that the launch screen displays correctly
   - Test on different device sizes and orientations
   - Ensure safe area handling works properly

The project is now configured with:
- Proper iOS deployment target (13.0+)
- Launch screen with app branding
- Safe area handling for all iOS devices
- Network security configurations for Capacitor
- Proper bundle identifier and app metadata
`;