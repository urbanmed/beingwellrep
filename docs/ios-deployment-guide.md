# iOS Deployment Guide for BeingWell App

## Overview
This guide covers the complete process for building and deploying the BeingWell app to iOS devices and the App Store.

## Prerequisites

### Required Software
- macOS (required for iOS development)
- Xcode (latest version from App Store)
- Bun package manager
- Git

### Required Accounts
- Apple Developer Account ($99/year)
- App Store Connect access

## Quick Start

### 1. Automated Build Process
```bash
# Make the build script executable
chmod +x scripts/ios-build.sh

# Run the complete build process
./scripts/ios-build.sh
```

### 2. Manual Build Process
If you prefer manual control:

```bash
# Clean and install dependencies
bun pm cache rm
bun install

# Build web app
bun run build

# Clean and sync iOS
bunx cap clean ios
bunx cap sync ios
bunx cap update ios

# Open in Xcode
bunx cap open ios
```

## iOS-Specific Features Implemented

### 1. Native iOS Configuration
- **Safe Area Support**: Proper handling of notches and home indicators
- **Status Bar**: Configured for light style with proper background
- **Keyboard Handling**: Native iOS keyboard integration
- **WebView Configuration**: Optimized for native iOS performance

### 2. Layout Optimizations
- **iOS Viewport Height**: Handles Safari address bar changes
- **Constraint System**: Fixed AutoLayout constraint conflicts
- **Touch Targets**: 44px minimum touch targets for accessibility
- **Navigation**: Proper iOS-style navigation with safe area awareness

### 3. Error Handling
- **Error Boundary**: Catches and handles JavaScript errors gracefully
- **iOS-Specific Errors**: Filters and handles known iOS warnings
- **Native Bridge**: Manages communication between web and native layers

## Xcode Configuration

### 1. App Configuration
- **Bundle Identifier**: `com.beingwell.app`
- **Display Name**: BeingWell
- **Minimum iOS Version**: 13.0
- **Supported Orientations**: Portrait (recommended)

### 2. Signing & Capabilities
1. Select your development team
2. Enable required capabilities:
   - Location Services (for emergency SOS)
   - Camera Access (for document scanning)
   - Photo Library Access (for document import)

### 3. Build Settings
- **Debug**: Use automatic signing for development
- **Release**: Use manual signing with distribution certificates

## App Store Deployment

### 1. Archive Process
1. In Xcode: Product → Archive
2. Wait for archive completion
3. Open Organizer when prompted

### 2. Upload to App Store Connect
1. Select "Distribute App"
2. Choose "App Store Connect"
3. Follow the upload wizard
4. Monitor upload progress

### 3. App Store Connect Configuration
- **App Information**: Health & Fitness category
- **Privacy**: Configure data usage descriptions
- **Screenshots**: Prepare for all required device sizes
- **App Review**: Complete app review information

## Troubleshooting

### Common Issues

#### 1. Build Errors
```bash
# Clean everything and rebuild
rm -rf node_modules ios/App/App/public dist
bun install
bun run build
bunx cap sync ios
```

#### 2. Signing Issues
- Verify Apple Developer Account status
- Check certificate expiration
- Update provisioning profiles

#### 3. WebView Issues
- Check console logs in Safari Web Inspector
- Verify network connectivity
- Check for JavaScript errors

### Error Messages

#### "Failed to resolve host network app id"
This is a development-only warning and doesn't affect production builds.

#### "RTIInputSystemClient" Warnings
These are iOS 17+ input system warnings and are non-critical.

#### AutoLayout Constraint Conflicts
Fixed in the current implementation with proper iOS layout utilities.

## Performance Optimization

### 1. Bundle Size
- Images are optimized for mobile
- Lazy loading implemented
- Code splitting enabled

### 2. iOS-Specific Optimizations
- Viewport height handling for Safari
- Touch event optimization
- Native scrolling behavior

### 3. Memory Management
- Proper cleanup of event listeners
- Optimized React components
- Efficient state management

## Testing

### 1. Simulator Testing
```bash
bunx cap run ios
```

### 2. Device Testing
1. Connect iOS device
2. Trust developer certificate on device
3. Build and run from Xcode

### 3. TestFlight
1. Upload to App Store Connect
2. Add external testers
3. Distribute beta builds

## Security Considerations

### 1. Data Protection
- All data encrypted in transit
- Secure authentication implementation
- Privacy-compliant data handling

### 2. App Transport Security
- HTTPS enforced for all network requests
- Certificate pinning implemented
- Secure storage for sensitive data

## Support and Resources

### Documentation
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Getting Help
- Check console logs for detailed error messages
- Use Safari Web Inspector for web layer debugging
- Contact Lovable support for platform-specific issues

---

**Last Updated**: Current deployment
**Version**: Production ready
**iOS Compatibility**: iOS 13.0+