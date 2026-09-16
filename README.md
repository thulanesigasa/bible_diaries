# Bible Diaries Web Application

![Platform](https://img.shields.io/badge/platform-Web-0EA5E9?style=flat-square)
![Framework](https://img.shields.io/badge/framework-Next.js%2016-000000?style=flat-square&logo=nextdotjs)
![React](https://img.shields.io/badge/library-React%2019-20232A?style=flat-square&logo=react)
![Database](https://img.shields.io/badge/backend-Supabase-3ECF8E?style=flat-square&logo=supabase)
![Styling](https://img.shields.io/badge/styling-Vanilla%20CSS-264DE4?style=flat-square&logo=css3)
![AI Moderation](https://img.shields.io/badge/moderation-OpenAI%20API-412991?style=flat-square&logo=openai)
![License](https://img.shields.io/badge/license-MIT-0F172A?style=flat-square)

**Bible Diaries** is a spiritual journaling and community reflection platform. Believers can document their spiritual walk, share scripture reflections across spiritual categories, offer prayerful encouragement through likes and comments, and engage in real-time direct messaging. 

Content integrity and an uplifting environment are maintained through automated AI moderation (OpenAI Moderation API) that screens journal entries prior to public release.

---

## Key Features

1. **User Authentication & Profiles**:
   - Secure sign-up and authentication powered by Supabase Auth.
   - Comprehensive profile management: testimony, favorite scripture verse, spiritual journey, avatar photo, and privacy toggles.

2. **Global Reflections Feed**:
   - Categorized reflections: Hope, Faith, Love, Strength, Gratitude, and Wisdom.
   - Category filtering to discover journal entries matching specific spiritual themes.
   - Interactive engagement: Likes, comment drawer, bookmarking favorites, and native device sharing.

3. **AI Content Moderation**:
   - Built-in integration with OpenAI Moderation API.
   - Real-time message screening during draft creation; abusive or explicit submissions are intercepted with constructive feedback.

4. **Fellowship Directory & Live Chat**:
   - Discover members through a community fellowship directory.
   - View members' profiles, testimony journeys, and favorite bible verses.
   - Direct real-time encrypted messaging between registered members.

5. **Settings Configuration**:
   - Customizable profile details, spiritual goals, and account privacy preferences.

---

## Project Architecture & Directory Structure

```
bible_diaries/
├── .github/                      # GitHub Actions automation workflows
│   └── workflows/
│       ├── build-apk.yml         # Builds Android APK on version tag push or dispatch
│       └── ota-update.yml        # Publishes OTA updates on push to main
├── mobile/                       # Expo SDK 57 React Native mobile application
│   ├── app/                      # Expo Router file-based screens
│   ├── components/               # Mobile UI components (UpdateModal, etc.)
│   ├── src/                      # Mobile hooks and Supabase client
│   ├── app.json                  # Expo application configuration
│   └── eas.json                  # EAS build profiles
├── public/                       # Static assets and public illustrations
├── scripts/                      # Maintenance and automation scripts
├── src/                          # Next.js web application source code
│   ├── app/                      # Next.js App Router routes & API endpoints
│   ├── components/               # Web UI components & layout elements
│   └── lib/                      # Supabase client singleton & helper libraries
├── .env.local.example            # Environment variables template
├── next.config.mjs               # Next.js bundler configuration
├── package.json                  # Web dependencies and npm scripts
├── schema.sql                    # PostgreSQL / Supabase database schema and RLS
├── seed.js                       # Database seeding script for sample entries
└── GEMINI.md                     # Official project rules & bundling guidelines
```

---

## Technology Stack

- **Application Framework**: Next.js 16 (App Router, JavaScript)
- **Styling Architecture**: Vanilla CSS with tailored design tokens (60-30-10 palette)
- **Database & Authentication**: Supabase (PostgreSQL with Row Level Security)
- **Content Moderation Engine**: OpenAI Moderation API
- **Iconography**: Lucide React / SVG icons
- **Companion Mobile Client**: React Native with Expo SDK 57 (located in `mobile/`)

---

## Setup & How to Run

### 1. Prerequisites
- Node.js 20 or higher installed.
- A live Supabase project.
- An OpenAI API key (for content moderation).

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Schema Setup
1. Navigate to your Supabase project dashboard and open the **SQL Editor**.
2. Run the queries in [`schema.sql`](./schema.sql). This configures:
   - Required tables: `profiles`, `diaries`, `likes`, `comments`, `favorites`, `chats`
   - Row Level Security (RLS) policies ensuring data privacy
   - Automatic triggers that create public profile records on user sign-up.

### 4. Environment Configuration
Create a `.env.local` file in the project root based on [`.env.local.example`](./.env.local.example):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

### 5. Running the Application Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to access the web application.

---

## Companion Mobile Application

The repository includes a companion cross-platform mobile application located in the [`mobile/`](./mobile) directory.
- Features Expo SDK 57, Expo Router, and Over-The-Air (OTA) updates.
- Refer to [`mobile/README.md`](./mobile/README.md) for mobile installation, emulator execution, and OTA update workflows.
