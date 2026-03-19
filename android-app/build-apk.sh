#!/bin/bash

echo "Building Neex Social Android APK..."
echo

# Check if Android SDK is installed
if [ ! -d "$ANDROID_HOME/tools" ]; then
    echo "Error: Android SDK not found!"
    echo "Please install Android Studio or set ANDROID_HOME environment variable"
    echo
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")"

echo "Step 1: Cleaning previous builds..."
./gradlew clean

echo
echo "Step 2: Building debug APK..."
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo
    echo "✅ SUCCESS: APK built successfully!"
    echo
    echo "📱 Debug APK location:"
    echo "   $(pwd)/app/build/outputs/apk/debug/app-debug.apk"
    echo
    echo "📲 To install on device:"
    echo "   1. Enable 'Unknown Sources' in Android Settings"
    echo "   2. Transfer APK to device and tap to install"
    echo "   3. Or use: adb install app-debug.apk"
    echo
else
    echo
    echo "❌ ERROR: Build failed!"
    echo "Check the error messages above for details."
    echo
fi

echo
read -p "Press Enter to continue..."
