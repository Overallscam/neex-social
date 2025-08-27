@echo off
echo 🚀 Neex Social - Quick Deploy Script
echo.

echo 📋 Available deployment options:
echo 1. PWA Test (Local server)
echo 2. Netlify Deploy (requires Netlify CLI)
echo 3. Build Cordova APK (requires Android SDK)
echo 4. Exit
echo.

set /p choice=Choose option (1-4): 

if "%choice%"=="1" (
    echo 🔄 Starting local PWA server...
    cd frontend
    python -m http.server 8080
    echo 📱 Open http://localhost:8080 to test PWA
)

if "%choice%"=="2" (
    echo 🌐 Deploying to Netlify...
    cd frontend
    netlify deploy --prod --dir .
    echo ✅ Deployed! Check your Netlify dashboard for the URL
)

if "%choice%"=="3" (
    echo 📱 Building Android APK...
    cd mobile-app
    cordova build android
    echo ✅ APK built! Check platforms/android/app/build/outputs/apk/
)

if "%choice%"=="4" (
    echo 👋 Goodbye!
    exit
)

pause
