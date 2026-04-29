# Android Setup for Play Store Deployment

## Prerequisites

1. **Android Studio**
   - Download from: https://developer.android.com/studio
   - Install with Android SDK, Android SDK Platform-Tools, and Android SDK Build-Tools

2. **Java Development Kit (JDK)**
   - Install JDK 17 or higher
   - Set JAVA_HOME environment variable

3. **Environment Variables**
   ```
   ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
   JAVA_HOME=C:\Program Files\Java\jdk-17
   ```

## Setup Steps

### 1. Install Dependencies
```bash
# Install the Capacitor dependencies we added to package.json
npm install
```

### 2. Initialize Capacitor
```bash
# Initialize Capacitor (run once)
npx cap init

# Add Android platform
npx cap add android
```

### 3. Build the App
```bash
# Build the web app
npm run build

# Sync with Capacitor
npm run cap:sync
```

### 4. Open in Android Studio
```bash
# Open the Android project
npm run cap:open:android
```

## Play Store Requirements

### 1. App Icons
- Create app icons in different sizes (512x512, 192x192, etc.)
- Place in `android/app/src/main/res/mipmap-*/`

### 2. App Signing
- Generate a keystore for signing the app
- Configure signing in Android Studio

### 3. Build Release APK/AAB
```bash
# In Android Studio:
# Build > Generate Signed Bundle/APK
# Choose Android App Bundle (.aab) for Play Store
```

### 4. Play Store Console
- Create developer account ($25 one-time fee)
- Upload app bundle
- Complete store listing
- Set pricing and distribution

## Common Issues

- **Gradle sync errors**: Check Android SDK installation
- **Build failures**: Verify JAVA_HOME is set correctly
- **Missing dependencies**: Run `npm install` and `npx cap sync`
- **Icon issues**: Use Android Studio's Image Asset Studio

## Testing

```bash
# Run on connected device/emulator
npm run cap:run:android
```
