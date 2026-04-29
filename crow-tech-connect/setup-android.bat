@echo off
echo Setting up CrowTech Android app for Play Store deployment...
echo.

echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Initializing Capacitor...
call npx cap init "CrowTech" "com.crowtech.app"
if %errorlevel% neq 0 (
    echo ERROR: Failed to initialize Capacitor
    pause
    exit /b 1
)

echo.
echo Step 3: Adding Android platform...
call npx cap add android
if %errorlevel% neq 0 (
    echo ERROR: Failed to add Android platform
    pause
    exit /b 1
)

echo.
echo Step 4: Building the web app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build web app
    pause
    exit /b 1
)

echo.
echo Step 5: Syncing with Capacitor...
call npx cap sync
if %errorlevel% neq 0 (
    echo ERROR: Failed to sync with Capacitor
    pause
    exit /b 1
)

echo.
echo Setup completed successfully!
echo.
echo Next steps:
echo 1. Install Android Studio if not already installed
echo 2. Run: npm run cap:open:android
echo 3. Configure app signing in Android Studio
echo 4. Build release APK/AAB for Play Store
echo.
pause
