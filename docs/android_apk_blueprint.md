# 📱 Android APK App Blueprint for Physiotherapists

This diagnostic roadmap outlines the exact, 100% free architecture to turn **Medic** into an installable Android `.apk` file that you can share directly via WhatsApp with Dr. Gursheen and all team physiotherapists, complete with live cloud sync and real-time push notifications.

---

## 🌟 Executive Summary of the Stack

| Component | Tool / Technology | Cost | Why It Was Chosen |
| :--- | :--- | :---: | :--- |
| **App Framework** | **Capacitor (by Ionic)** | **$0** (Free & Open Source) | Converts existing React/Vite web app into native Android code without rewriting anything. |
| **Update Strategy** | **Live-Sync (Vercel Web URL)** | **$0** | APK loads `https://medic-tau.vercel.app`. Whenever you push code, all physios get updates automatically—**zero manual APK re-installs needed!** |
| **Push Notifications** | **Firebase Cloud Messaging (FCM)** | **$0** (Free tier, unlimited) | Delivers genuine Android native notification banners with sound and vibration even when the app is completely closed or screen is locked. |
| **Notification Targeting** | **Physio Email / ID + Broadcast** | **$0** | Targeted alerts for assigned patients + clinic-wide broadcasts. |
| **APK Build Pipeline** | **GitHub Actions Cloud Builder** | **$0** (2,000 free build min/mo) | Builds `medic-physio.apk` in GitHub's cloud in ~2 minutes without needing Android Studio or Java installed on your PC. |

---

## 🏗️ Architecture & How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      Physiotherapist's Phone                │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Medic Native Android App (.apk)        │   │
│   │                                                     │   │
│   │  ┌───────────────────────────────────────────────┐  │   │
│   │  │   Android Native Shell (Capacitor)            │  │   │
│   │  │   - Push Notification Receiver (FCM)          │  │   │
│   │  │   - Hardware Audio & Haptics Access           │  │   │
│   │  │   - Native Splash Screen & Status Bar         │  │   │
│   │  └───────────────────────────────────────────────┘  │   │
│   │                          ▲                          │   │
│   │                          │ Seamless Live Sync       │   │
│   │                          ▼                          │   │
│   │  ┌───────────────────────────────────────────────┐  │   │
│   │  │   Live Medic Web Portal (medic-tau.vercel.app)│  │   │
│   │  │   - Daily Walk-in Reports                     │  │   │
│   │  │   - 3D Interactive Recovery Visualizer        │  │   │
│   │  │   - Patient Capture & Clinical Management     │  │   │
│   │  └───────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ Native Push Notifications
            ┌──────────────────┴──────────────────┐
            │       Firebase Cloud Messaging      │
            │  (Free Cloud Push Dispatch Engine)  │
            └─────────────────────────────────────┘
```

---

## 📋 Step-by-Step Implementation Roadmap

### Step 1: Capacitor Integration (In This Codebase)
1. Install `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android`.
2. Initialize `capacitor.config.json` configured with:
   - App ID: `com.comfortgrid.medic`
   - App Name: `Medic - Comfort Grid`
   - Server URL: `https://medic-tau.vercel.app` (for live-sync updates)
   - Cleartext traffic allowed (for smooth API handshakes)
3. Generate the Android project template: `npx cap add android`.

### Step 2: Push Notifications via Firebase Cloud Messaging (FCM)
1. Create a free Firebase project: **Medic-Physio**.
2. Download the free configuration file: `google-services.json` and place it in `android/app/`.
3. Add `@capacitor/push-notifications`:
   - When a physio logs in, the app registers their FCM push token into your Supabase database linked to their email (e.g. `gursheen.kaur@thesleepcompany.in`).
   - Supports background notifications with custom sound and vibration.

### Step 3: Admin Push Notification Dispatcher
1. Inside the existing Admin Panel (`/admin`), add a lightweight **"Send Physio Notification"** modal:
   - **Recipient**: Dropdown selector (`All Physios (Broadcast)`, `Dr. Gursheen`, `Dr. Dipti`, `Dr. Rutuja`, etc.)
   - **Title**: e.g., *"New Patient Assigned"* or *"Daily Walk-in Reminder"*
   - **Message Body**: e.g., *"Please review your 27th October tracker report."*
2. Serverless API route `/api/send-notification` sends the payload to FCM via free Firebase Admin SDK.

### Step 4: GitHub Actions Cloud APK Builder (`.github/workflows/build-apk.yml`)
1. Create an automated GitHub workflow:
   - Triggers automatically when you push, or via a simple "Run workflow" button on GitHub.
   - Sets up Java 17 and Android SDK in the cloud.
   - Runs `./gradlew assembleDebug`.
   - Uploads `medic-physio.apk` directly to GitHub Releases/Artifacts.
2. You click **Download**, save the `.apk`, and forward it via WhatsApp to the team!

---

## 💡 Key Advantages for the Clinic

- **100% Free**: No Google Play Store developer fee ($25 saved), no monthly server fees.
- **Immediate Deployment**: Physios can install it directly by tapping the APK on WhatsApp and clicking "Install".
- **Zero Maintenance Overhead**: Because it uses Live-Sync mode, any bug fixes or feature additions pushed to Vercel instantly appear in the physio's app without requiring them to download a new APK!
- **Uncompromised Website**: The public customer preview links (`/r/:id`) and desktop browser links continue to work identically as before.

