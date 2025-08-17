# iOS Deployment Guide for BeingWell

This guide covers the complete iOS deployment process for the BeingWell health application.

## Prerequisites

- macOS with Xcode 14+ installed
- iOS Developer Account (for device testing and App Store deployment)
- Node.js and npm installed
- Capacitor CLI installed globally: `npm install -g @capacitor/cli`

## Project Setup

### 1. Initial Setup
```bash
# Clone and setup project
git clone [your-repo-url]
cd beingwell
npm install

# Build the web app
npm run build

# Sync with iOS
npx cap sync ios
```

### 2. iOS Platform Setup
```bash
# Add iOS platform (if not already added)
npx cap add ios

# Open in Xcode
npx cap open ios
```

## Configuration Files

### Key Files Structure
```
ios/
├── App/
│   ├── App/
│   │   ├── Info.plist                 # App configuration
│   │   ├── Assets.xcassets/           # App icons and colors
│   │   │   ├── AccentColor.colorset/
│   │   │   └── AppIcon.appiconset/
│   │   └── Base.lproj/
│   │       └── LaunchScreen.storyboard # Launch screen
│   └── App.xcodeproj/
├── ios-build-config.ts               # Build configuration
└── README.md                          # This file
```

### App Configuration (Info.plist)
- **Bundle ID**: `com.beingwell.app`
- **App Name**: BeingWell
- **Minimum iOS Version**: 13.0
- **Supported Orientations**: Portrait only
- **Permissions**: Camera, Photo Library, Location, Microphone

## Development Workflow

### 1. Development Build
```bash
# Make changes to web app
npm run dev

# Build and sync changes
npm run build
npx cap sync ios

# Run on simulator/device
npx cap run ios
```

### 2. Testing on Physical Device
```bash
# Ensure you're signed into Xcode with Apple ID
# Connect iPhone/iPad via USB
# Select device in Xcode
# Build and run (Cmd+R)
```

## App Store Deployment

### 1. Prepare for App Store
```bash
# Set production environment
# Update version numbers in Info.plist
# Build release version
npm run build
npx cap sync ios
```

### 2. Xcode Configuration
1. Open project in Xcode: `npx cap open ios`
2. Select "App" target
3. Set deployment target to iOS 13.0+
4. Configure signing & capabilities:
   - Team: Your developer team
   - Bundle Identifier: `com.beingwell.app`
   - Signing Certificate: iPhone Distribution

### 3. App Icons and Assets
- App icons are configured in `Assets.xcassets/AppIcon.appiconset/`
- Required sizes: 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024
- Launch screen is configured in `LaunchScreen.storyboard`

### 4. Build and Archive
```bash
# Create archive build
Product → Archive (in Xcode)

# Upload to App Store Connect
Window → Organizer → Upload to App Store
```

## Troubleshooting

### Common Issues

#### Build Errors
- **"No provisioning profiles found"**: Set up signing in Xcode project settings
- **"Missing required icon file"**: Add all required icon sizes to AppIcon.appiconset
- **"Unsupported Architecture"**: Set Build Settings → Architectures to arm64

#### Runtime Issues
- **White screen on launch**: Check that `npm run build` was run before `npx cap sync`
- **Permissions not working**: Verify usage descriptions in Info.plist
- **Network requests failing**: Check App Transport Security settings

#### Safe Area Issues
- **Content behind notch**: Ensure safe area constraints are properly set
- **Bottom content hidden**: Check home indicator spacing
- **Header/navigation issues**: Verify status bar configuration

### Debug Commands
```bash
# Check iOS logs
npx cap run ios --verbose

# Clean and rebuild
npx cap clean ios
npm run build
npx cap sync ios

# Open iOS simulator logs
xcrun simctl spawn booted log stream --predicate 'process == "App"'
```

## App Store Guidelines

### Metadata Requirements
- **Category**: Medical
- **Keywords**: health, medical, reports, wellness, documents
- **Description**: Focus on health management and document organization
- **Screenshots**: Include iPhone and iPad screenshots
- **Privacy Policy**: Required for health apps

### Review Considerations
- Health apps require careful review
- Ensure compliance with medical data regulations
- Test all permission flows thoroughly
- Verify accessibility features work correctly

## Continuous Integration

### GitHub Actions Example
```yaml
name: iOS Build
on: [push, pull_request]
jobs:
  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run build
      - run: npx cap sync ios
      - run: xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 14' build
```

## Support

For deployment issues:
1. Check this README first
2. Review Capacitor iOS documentation
3. Check Xcode console for detailed error messages
4. Verify all certificates and provisioning profiles are valid

## Version History

- **v1.0.0**: Initial iOS deployment configuration
- App Store submission ready
- Supports iOS 13.0+
- Universal app (iPhone + iPad)