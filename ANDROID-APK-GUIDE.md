# 📱 Neex Social Android APK - Quick Setup Guide

## ✅ What's Created
I've created a complete Android app project that wraps your Neex Social website in a native Android app with:

- 🌐 WebView that loads your website (currently set to `https://neex.netlify.app`)
- 🔄 Pull-to-refresh functionality
- 🔙 Hardware back button support
- 📱 Native Android app experience
- 🎨 Custom app icon and branding
- 🔗 Deep linking support

## 🚀 Quick APK Generation Options

### Option 1: Online APK Builder (Easiest)
1. **Zip the android-app folder**
2. **Upload to online APK builders:**
   - AppsGeyser: https://appsgeyser.com
   - Andromo: https://andromo.com
   - BuildFire: https://buildfire.com

### Option 2: Android Studio (Recommended)
1. **Download Android Studio**: https://developer.android.com/studio
2. **Install and setup Android SDK**
3. **Open the `android-app` folder in Android Studio**
4. **Click Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. **APK will be generated in: `app/build/outputs/apk/debug/`**

### Option 3: GitHub Actions (Automated)
I can set up automatic APK building using GitHub Actions if you have a GitHub repository.

## 📲 How to Install the APK

1. **Enable Unknown Sources:**
   - Go to Android Settings → Security
   - Enable "Install unknown apps" or "Unknown sources"

2. **Install the APK:**
   - Transfer APK file to your Android device
   - Tap the APK file
   - Follow installation prompts
   - The "Neex Social" app will appear in your app drawer

## ⚙️ Customization

### Change Website URL
Edit `app/src/main/java/com/neex/social/MainActivity.java` line 20:
```java
private static final String WEBSITE_URL = "https://your-domain.com";
```

### Change App Name
Edit `app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Your App Name</string>
```

### Change App Icon
Replace icon files in:
- `app/src/main/res/mipmap-hdpi/`
- `app/src/main/res/mipmap-mdpi/`
- `app/src/main/res/mipmap-xhdpi/`
- etc.

## 🔧 Build Commands (if you have Android SDK)

### Windows:
```bash
cd android-app
.\build-apk.bat
```

### Linux/Mac:
```bash
cd android-app
./build-apk.sh
```

### Manual Gradle:
```bash
cd android-app
./gradlew assembleDebug
```

## 📁 Project Structure
```
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/neex/social/
│   │   │   └── MainActivity.java          # Main app logic
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   │   └── activity_main.xml      # App layout
│   │   │   ├── values/
│   │   │   │   ├── strings.xml            # App name & text
│   │   │   │   └── styles.xml             # App theme
│   │   │   └── mipmap-*/                  # App icons
│   │   └── AndroidManifest.xml            # App permissions
│   └── build.gradle                       # App dependencies
├── build.gradle                           # Project config
├── build-apk.bat                          # Windows build script
├── build-apk.sh                           # Linux/Mac build script
└── README.md                              # Documentation
```

## 🎯 Features Included

- ✅ Website loads in full-screen WebView
- ✅ JavaScript and local storage enabled
- ✅ Camera and file upload permissions
- ✅ Pull-to-refresh
- ✅ Hardware back button navigation
- ✅ Custom splash screen and icon
- ✅ External link handling
- ✅ Network error handling

## 🚨 Next Steps

1. **Choose your preferred APK generation method above**
2. **Customize the website URL if needed**
3. **Build and install the APK**
4. **Test on Android device**

## 💡 Pro Tips

- **For Play Store**: You'll need to sign the APK with a keystore
- **For updates**: When your website updates, the app automatically shows new content
- **For offline**: Consider implementing service workers on your website
- **For notifications**: Add Firebase Cloud Messaging to the Android project

Would you like me to help with any of these steps or set up GitHub Actions for automatic APK building?
