# Neex Social Android App

This is the official Android app for Neex Social - a WebView-based wrapper that provides native Android app experience for the Neex Social platform.

## Features

- 📱 Native Android app experience
- 🔄 Pull-to-refresh functionality
- 🔙 Back button navigation
- 🌐 Full website functionality in WebView
- 📲 Automatic app updates when website updates
- 🔗 Deep linking support
- 📵 Offline page caching

## Building the APK

### Prerequisites
- Android Studio or Android SDK
- Java JDK 8 or higher
- Gradle

### Build Steps

1. **Using Android Studio:**
   ```bash
   # Open the android-app folder in Android Studio
   # Click Build -> Build Bundle(s) / APK(s) -> Build APK(s)
   ```

2. **Using Command Line:**
   ```bash
   cd android-app
   ./gradlew assembleRelease
   ```

3. **Quick Build Script (Windows):**
   ```bash
   # Run the build script
   ./build-apk.bat
   ```

### Output
- Debug APK: `app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `app/build/outputs/apk/release/app-release.apk`

## Installation

1. **Enable Unknown Sources:**
   - Go to Settings > Security
   - Enable "Unknown Sources" or "Install unknown apps"

2. **Install APK:**
   ```bash
   # Using ADB
   adb install app-debug.apk
   
   # Or transfer APK to phone and install manually
   ```

3. **Direct Installation:**
   - Transfer the APK file to your Android device
   - Tap on the file to install
   - Follow the installation prompts

## App Configuration

### Changing Website URL
Edit `MainActivity.java` line 20:
```java
private static final String WEBSITE_URL = "https://your-website.com";
```

### App Branding
- App name: Edit `res/values/strings.xml`
- App icon: Replace files in `res/mipmap-*` folders
- App colors: Edit `res/values/styles.xml`

## Features Included

### WebView Settings
- JavaScript enabled
- Local storage enabled
- Mixed content support (HTTP/HTTPS)
- Responsive design support
- Custom User Agent

### Native Features
- Hardware back button support
- Pull-to-refresh
- Error handling
- Loading indicators
- External link handling

### Permissions
- Internet access
- Network state checking
- Camera access (for photo uploads)
- Storage access (for file uploads)
- Audio recording (for voice messages)

## Customization

### App Icon
Replace these files with your custom icon:
- `res/mipmap-hdpi/ic_launcher.png` (72x72)
- `res/mipmap-mdpi/ic_launcher.png` (48x48)
- `res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

### App Theme
Edit `res/values/styles.xml` to match your website colors:
```xml
<item name="android:colorPrimary">#1d9bf0</item>
<item name="android:colorPrimaryDark">#1a8cd8</item>
```

## Troubleshooting

### Common Issues

1. **App crashes on startup:**
   - Check internet connection
   - Verify website URL is accessible
   - Check Android logs: `adb logcat`

2. **Website not loading:**
   - Ensure `android:usesCleartextTraffic="true"` in manifest
   - Check network permissions
   - Verify SSL certificates

3. **File uploads not working:**
   - Check storage permissions
   - Test camera permissions
   - Verify WebView settings

### Debug Mode
Enable debug mode in `MainActivity.java`:
```java
WebView.setWebContentsDebuggingEnabled(true);
```

## Publishing to Play Store

1. **Generate signed APK:**
   ```bash
   ./gradlew assembleRelease
   ```

2. **Create keystore:**
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore -alias alias_name -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **Sign APK:**
   ```bash
   jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore app-release.apk alias_name
   ```

4. **Upload to Play Console**

## License

This Android app wrapper is part of the Neex Social project.

## Support

For issues related to the Android app, please contact the development team or create an issue in the repository.
