# Bible Diaries Mobile App

![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-0EA5E9?style=flat-square)
![Framework](https://img.shields.io/badge/framework-Expo%20SDK%2057-000020?style=flat-square&logo=expo)
![Language](https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square&logo=typescript)
![CI](https://img.shields.io/github/actions/workflow/status/thulanesigasa/bible_diaries/ota-update.yml?branch=main&label=OTA%20Publish&style=flat-square)
![Build](https://img.shields.io/github/actions/workflow/status/thulanesigasa/bible_diaries/build-apk.yml?label=APK%20Build&style=flat-square)
![License](https://img.shields.io/badge/license-MIT-0F172A?style=flat-square)

A premium spiritual journaling mobile application built with **Expo** and **React Native**, using **Expo Router** for file-based navigation. The app integrates with a live Supabase backend and supports automatic **OTA (Over-The-Air) updates** so users never need to reinstall.

---

## Features

- **Reflections Feed** — Browse journal entries by category (Hope, Faith, Love, Wisdom)
- **Support & Interaction** — Bookmark entries and like reflections
- **Fellowship Directory** — Browse community member profiles
- **Private Direct Messaging** — Real-time encrypted messages between members
- **Account Profiles & Settings** — Manage testimony, scripture, avatar, and privacy
- **Dynamic Initials Avatars** — Auto-renders initials when no profile picture is set
- **Brand Identity & Adaptive Icons** — Authentic custom Bible logo, Android adaptive foreground/background launcher icon, and web favicons
- **Multi-Step Auth Flow & Keyboard Navigation** — Multi-step registration (Account, Personal Details, Profile Setup) with Android soft keyboard `Next` / `Sign In` action labels, step auto-advance, and instant auto-focus on step transitions
- **OTA Updates** — In-app popup when a new version is available; updates without reinstall

---

## Directory Structure

```
mobile/
├── app/                   # Expo Router file-based routes
│   ├── (auth)/            # Authentication screens (login, register)
│   ├── (tabs)/            # Main tab navigator
│   ├── chat/              # Direct message thread screens
│   ├── post/              # Individual reflection screens
│   ├── profile/           # Member profile screens
│   └── _layout.tsx        # Root layout — mounts UpdateModal & AppContext
├── assets/                # Fonts, icons, splash images
├── components/
│   └── UpdateModal.tsx    # OTA update prompt modal
├── constants/             # App-wide constants (colors, spacing)
├── src/
│   ├── hooks/
│   │   └── useOTAUpdate.ts  # Hook that checks and applies OTA bundles
│   └── lib/
│       └── supabase.ts    # Supabase client singleton
├── app.json               # Expo config (package name, OTA updates, runtimeVersion)
├── eas.json               # EAS build profiles (development / preview / production)
└── package.json
```

---

## CI/CD & OTA Updates

### How it works

| Trigger | Action | Result |
|---|---|---|
| Push to `main` (mobile/** files) | `ota-update.yml` runs | New JS bundle published to EAS production channel. Users get an in-app popup. |
| Push a version tag (e.g. `v1.2.0`) | `build-apk.yml` runs | Full Android APK built via EAS Cloud, attached to GitHub Release. |

### OTA Update Flow

1. You push code changes to `main`
2. GitHub Actions publishes a new bundle to Expo's CDN (takes ~2 min)
3. When a user opens the app or returns to the foreground, `useOTAUpdate` checks for a new bundle
4. The `<UpdateModal>` appears with a "Update Now" button
5. User taps it — bundle downloads silently, app reloads
6. User sees the latest version with zero reinstall friction

> OTA updates only deliver JavaScript and asset changes. A full APK rebuild is only required when native modules change — which is rare.

### Required GitHub Secret

| Secret | Where to get it |
|---|---|
| `EXPO_TOKEN` | Run `eas token:create` in your terminal after `eas login` |

---

## Setup & Configuration

### 1. Environment Variables

Create a `.env` file in the `mobile/` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

*Note: Safe fallbacks are configured in `src/lib/supabase.js` and in the GitHub CI/CD workflows to prevent static export errors during remote builds.*

### 2. Install Dependencies

```bash
cd mobile
npm install
```

### 3. Run Locally

```bash
npm start         # Expo dev server (scan QR in Expo Go)
npm run android   # Open on Android emulator/device
npm run ios       # Open on iOS simulator (macOS only)
```

### 4. One-time EAS Setup (for CI/CD)

The app is linked to the EAS project **`@thulanesigasa0/bible-diaries`** (Project ID: `fe39d2bf-81e4-4901-8583-caadeb91cc1c`).

To enable GitHub Actions CI/CD to publish OTA updates and build APKs:
1. Go to your Expo Access Tokens page: [expo.dev/accounts/thulanesigasa0/settings/access-tokens](https://expo.dev/accounts/thulanesigasa0/settings/access-tokens)
2. Create a new Personal Access Token with read/write permissions.
3. Add the token to GitHub repository secrets:
   - Go to **GitHub Repository → Settings → Secrets and variables → Actions**
   - Click **New repository secret**
   - Secret Name: `EXPO_TOKEN`
   - Secret Value: *(paste your Expo access token)*

---

## Releasing a New Native Build

You can trigger a fresh APK build in two ways:

### Option A: Via GitHub Actions Tab (Manual Trigger)
1. Go to the **Actions** tab in the GitHub repository.
2. Select **Build Android APK** from the left sidebar.
3. Click **Run workflow**, enter the version tag (e.g. `v1.0.0`), and click **Run workflow**.

### Option B: Via Git Tag
```bash
# Bump version in package.json and app.json, then:
git tag v1.0.1
git push origin v1.0.1
```

Once the build completes on EAS, the APK is automatically uploaded and attached to a new GitHub Release under the **Releases** tab.

---

## Publishing OTA Updates

- **Automatic**: Every commit pushed to `main` modifying `mobile/**` automatically publishes an OTA update.
- **Manual**: Go to **Actions → OTA Update — Publish Bundle → Run workflow** to publish on-demand.

