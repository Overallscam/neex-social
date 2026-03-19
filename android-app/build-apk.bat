@echo off
echo Building Neex Social Android APK...
echo.

REM Check if Android SDK is installed
if not exist "%ANDROID_HOME%\tools" (
    echo Error: Android SDK not found!
    echo Please install Android Studio or set ANDROID_HOME environment variable
    echo.
    pause
    exit /b 1
)

REM Navigate to project directory
cd /d "%~dp0"

echo Step 1: Cleaning previous builds...
call gradlew clean

echo.
echo Step 2: Building debug APK...
call gradlew assembleDebug

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ SUCCESS: APK built successfully!
    echo.
    echo 📱 Debug APK location:
    echo    %~dp0app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo 📲 To install on device:
    echo    1. Enable "Unknown Sources" in Android Settings
    echo    2. Transfer APK to device and tap to install
    echo    3. Or use: adb install app-debug.apk
    echo.
    
    REM Try to open the output folder
    if exist "app\build\outputs\apk\debug\" (
        echo Opening APK folder...
        start "" "app\build\outputs\apk\debug\"
    )
) else (
    echo.
    echo ❌ ERROR: Build failed!
    echo Check the error messages above for details.
    echo.
)

echo.
pause
