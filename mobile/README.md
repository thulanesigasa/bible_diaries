# bible_diaries Mobile App

Welcome to the **bible_diaries** mobile application, built with **Expo** and **React Native** utilizing **Expo Router** for universal file-based navigation. 

This mobile client is designed to deliver a premium, responsive, light spiritual journaling experience directly to iOS and Android devices, fully integrated with your live Supabase backend.

---

## What the App Is About

The mobile application replicates and extends the web reflection journaling experience:
- **Reflections Feed**: Scroll through categories (Hope, Faith, Love, Wisdom) and view shared journal entries written by members.
- **Support & Interaction**: Bookmark your favorite entries and offer encouragement by liking reflections.
- **Fellowship Directory (Connect)**: Browse the profiles of other believers in the community.
- **Private Direct Messaging**: Send private real-time messages to connect deeply with other members.
- **Account Profiles & Settings**: Manage your personal testimonies, favorite scriptures, profile information, and customize notifications/privacy preferences using Apple-style toggle switches.
- **Dynamic Initials Avatars**: Automatically renders initials from the user's name if no profile picture is configured.

---

## Configuration & Setup

Before running the application, you must configure your Supabase live connection credentials.

1. **Create an Environment File**:
   Create a `.env` or `.env.local` file in the root of the `mobile/` directory:
   ```bash
   touch .env
   ```

2. **Add Your Supabase Credentials**:
   Add the following variables (prefixed with `EXPO_PUBLIC_` so they are accessible to Expo's client bundle during runtime):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anonymous-api-key-string
   ```

---

## How to Run the App

Unlike the Next.js web application which uses `npm run dev`, the Expo mobile app uses **`npm run start`** or **`npm start`** to launch the Expo development bundle server.

### 1. Install Dependencies
Ensure you have installed the project packages inside the `mobile/` folder:
```bash
npm install
```

### 2. Start the Development Server
Run the startup command from the `mobile/` directory:
```bash
npm run start
```

This launches the **Expo Go Developer Console** inside your terminal and displays a QR code.

### 3. Open on Your Device
- **iOS**: Scan the terminal's QR code using the iOS Camera app (requires the **Expo Go** app installed from the App Store).
- **Android**: Scan the QR code using the **Expo Go** app (downloadable from the Google Play Store).
- **Emulators**:
  - Press `a` in the terminal to launch on a connected Android Emulator / Device.
  - Press `i` in the terminal to launch on an iOS Simulator (macOS only).
  - Press `w` in the terminal to launch on a local web view.
