#!/bin/bash

set -e  # Exit on error

echo "==================================="
echo "Building Scorer Android APK"
echo "==================================="
echo ""

echo "Step 1: Building H5..."
npm run build:h5
echo "✓ H5 build completed"
echo ""

echo "Step 2: Copying to Cordova..."
node scripts/copy-to-cordova.js
echo "✓ Files copied to Cordova"
echo ""

echo "Step 3: Building APK..."
cd platforms/android
cordova build android
cd ../..
echo "✓ APK build completed"
echo ""

echo "==================================="
echo "Build Successful!"
echo "==================================="
echo ""
echo "APK Location:"
echo "  platforms/android/app/build/outputs/apk/"
echo ""
