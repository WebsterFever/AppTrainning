# Webster Technology School — Mobile app — iPhone and Android (Expo)

This is a **React Native / Expo TypeScript starter**, separate from the existing React website. It uses the **existing NestJS backend** and database; do not create a second backend.

## Implemented in this starter
- Native iOS / Android UI, Haitian Creole / English / French selector
- Upcoming and past course lists, refreshed every 10 seconds and on pull-to-refresh
- Full course poster, course details, and free-class registration
- Existing student chat API (load/send messages); manual refresh, not yet socket realtime
- Paid-course button opens existing website; **no native payment integration**
- Expo EAS Android build configuration (APK preview and AAB production)

## Not yet implemented
Full curriculum lesson playback and progress, admin/teacher dashboard, contest, notifications, persistent student session, realtime socket chat, in-app paid enrollment, Android Play Store review compliance and end-to-end testing. Do not describe this starter as a finished Play Store app.

## Run on Windows with Visual Studio Code
1. Install Node.js LTS, Git and Visual Studio Code.
2. Clone: `git clone https://github.com/WebsterFever/AppTrainning.git`
3. `cd AppTrainning/mobile`
4. `npm install`
5. Copy `.env.example` to `.env` and use the prefilled existing Railway backend URL `https://apptrainning-production.up.railway.app` (not the website frontend URL). The same public API URL is also the app's default if `.env` is missing.
6. `npx expo start`
7. Install **Expo Go** on your iPhone or Android phone and scan the QR code, or run an Android emulator. On iPhone, use the Camera app to scan the QR code. Ensure Expo Go and the project's SDK are compatible.

### Android build
Install EAS CLI: `npm install -g eas-cli`; then `eas login`, `eas build:configure`, `eas build -p android --profile preview` for a test APK. For Play Store use `eas build -p android --profile production` (AAB), then configure the Play Console listing, privacy policy, data safety, account requirements and app review.

**Important:** `app.json` package ID must be confirmed before first Play Store upload; `extra.eas.projectId` is a placeholder and must be set by `eas build:configure`. Never put backend secrets in EXPO_PUBLIC_* variables.

For later updates: `git pull origin main` in the repository root, then `cd mobile && npm install`.

The web frontend remains in `frontend/` and backend in `backend/`; no existing files are modified.
