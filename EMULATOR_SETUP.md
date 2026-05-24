# Running Hexa POS Nexus Mobile on an Emulator

## Current Status ✅

Your app is ready to run! Here's what's working:

- ✅ Metro bundler is running successfully
- ✅ All dependencies installed
- ✅ Login screen is fully implemented with theme system
- ✅ App structure is complete

The Metro bundler is currently running in the background and listening for connections.

## Prerequisites for Running on Emulator

### Option 1: Android Emulator (Windows)

#### Step 1: Install Android Studio
1. Download from: https://developer.android.com/studio
2. Install Android Studio
3. During setup, install:
   - Android SDK
   - Android Emulator
   - Google Play services

#### Step 2: Set up Android Virtual Device (AVD)
1. Open Android Studio
2. Go to: **Tools → Device Manager → Create device**
3. Select a device (e.g., Pixel 5)
4. Download a system image (e.g., Android 14)
5. Finish setup

#### Step 3: Set Environment Variables
```powershell
# Add to your system environment variables:
ANDROID_HOME = C:\Users\<YourUsername>\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT = C:\Users\<YourUsername>\AppData\Local\Android\Sdk

# Add to PATH:
C:\Users\<YourUsername>\AppData\Local\Android\Sdk\platform-tools
C:\Users\<YourUsername>\AppData\Local\Android\Sdk\tools
```

#### Step 4: Start Emulator & Build APK
```bash
# Start Android emulator (from Android Studio or command line)
emulator -avd Pixel_5_API_34

# Wait for emulator to fully load, then run:
npm run android
```

### Option 2: iOS Simulator (Mac Only)
```bash
npm run ios
```

### Option 3: Expo Go (Easiest, No Setup)
For testing without complex setup, you can use Expo:

```bash
# Start Expo development server
npx expo start

# Scan QR code with:
# - Expo Go app (available on iOS/Android)
# - Physical device camera
```

## Current Setup

Your Metro bundler is running. You can:

1. **Build for Android:**
   ```bash
   npm run android
   ```

2. **Build for iOS (Mac only):**
   ```bash
   npm run ios
   ```

3. **Check Metro status:**
   The Metro server is listening at: http://localhost:8081

## File Structure

```
hexa-pos-nexus-mobile/
├── src/
│   ├── App.tsx              # Main app entry point
│   ├── screens/
│   │   └── LoginScreen.tsx  # Login screen with theme integration
│   ├── theme/
│   │   ├── index.ts         # Complete theme system
│   │   └── utils.ts         # Theme utilities
│   ├── components/          # Reusable components
│   ├── services/            # API services
│   ├── types/               # TypeScript types
│   └── constants/           # App constants
├── package.json
├── metro.config.js
└── babel.config.js
```

## Quick Start Guide

1. **Terminal 1 - Metro Bundler (Already Running):**
   ```bash
   npm start
   ```

2. **Terminal 2 - Build & Run:**
   ```bash
   npm run android
   # or
   npm run ios
   ```

3. **Watch for changes:**
   Metro will automatically rebuild when you save files

## Troubleshooting

### Issue: "ANDROID_HOME is not set"
**Solution:** Set the ANDROID_HOME environment variable (see Step 3 above)

### Issue: "Emulator not found"
**Solution:** Create AVD in Android Studio (see Step 2 above)

### Issue: "Metro throws error"
**Solution:** Already fixed! Metro is running successfully

### Issue: "Build fails"
**Solution:** Try:
```bash
npm install
rm -r node_modules
npm install
npm start
```

## Next Steps

1. Set up Android Studio and create an emulator
2. Set environment variables for ANDROID_HOME
3. Run `npm run android` to build and deploy to emulator
4. The login screen will appear on your simulated phone

## Design Preview

The login page features:
- Dark navy background (#1a1f2e)
- Card-based modal layout
- Green accent color (#22c55e) for branding
- Pre-filled username field
- Password field
- Full-width login button with arrow icon
- Mobile-first responsive design

All styling uses the centralized theme system for consistency across the app.

---

**Need Help?** 
Check the React Native docs: https://reactnative.dev/docs/getting-started
