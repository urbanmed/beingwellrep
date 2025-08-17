#!/bin/bash

# iOS Build Script for BeingWell App
# This script builds the app for iOS deployment

set -e  # Exit on any error

echo "🍎 Starting iOS build process for BeingWell..."

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: iOS builds require macOS"
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: Xcode is required for iOS builds"
    echo "Please install Xcode from the App Store"
    exit 1
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is required"
    echo "Please install Bun: https://bun.sh"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf ios/App/App/public/
bun pm cache rm

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build the web app
echo "🔨 Building web app..."
bun run build

# Clean iOS platform
echo "🧹 Cleaning iOS platform..."
bunx cap clean ios

# Sync with iOS platform
echo "🔄 Syncing with iOS platform..."
bunx cap sync ios

# Update iOS platform
echo "🔄 Updating iOS platform..."
bunx cap update ios

echo "✅ iOS build preparation complete!"
echo ""
echo "📱 Next steps:"
echo "1. Run: bunx cap open ios"
echo "2. In Xcode:"
echo "   - Select your development team"
echo "   - Choose your target device/simulator"
echo "   - Build and run the project"
echo ""
echo "🚀 For App Store deployment:"
echo "1. Archive the project in Xcode"
echo "2. Upload to App Store Connect"
echo ""
echo "📖 Need help? Check: https://lovable.dev/blogs/TODO"