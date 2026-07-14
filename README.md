# bible_diaries

Welcome to **bible_diaries**, a premium, visually stunning web application for sharing daily diaries, reflections, and scripture readings. Users can register with comprehensive profiles, publish daily diaries under various categories (e.g., Hope, Faith, Love, Strength), interact via likes/comments/favorites, and connect/chat with other brothers and sisters in real-time.

A dedicated **AI Content Moderation** service (powered by OpenAI) filters and flags vulgar or explicit messages before they are posted to ensure a safe, uplifting environment.

---

## 🌟 Key Features

1. **User Authentication & Profiles**:
   - Secure sign-up & log-in via Supabase Auth.
   - Comprehensive profile creation (Full Name, Avatar image, Bio, Favorite Bible Verse, and Spiritual Journey story).
2. **Global Reflections Feed**:
   - Post-by-category organization (Hope, Faith, Love, Strength, Gratitude, Wisdom).
   - Category filtering to easily browse entries matching specific spiritual themes.
   - Interactive features: Likes, Comments drawer, Add to Favorites, and Share actions (copy-to-clipboard and native device sharing).
3. **AI Content Moderation**:
   - Integration with OpenAI Moderation API.
   - Message analysis during draft creation. Vulgar, abusive, or explicit entries are rejected with feedback showing why.
4. **Connect Directory & Live Chat**:
   - Discover other members through a directory.
   - Read members' detailed spiritual profile, favorite verses, and spiritual journey.
   - Initiate direct real-time messaging (chats) between users.
5. **Settings Configuration**:
   - Edit full name, bio, favorite bible verse, and spiritual journey.
   - Update avatar pictures.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, JavaScript)
- **Styling**: Vanilla CSS (no CSS frameworks, providing pure custom premium styles)
- **Database, Auth & Realtime**: Supabase
- **Moderation AI**: OpenAI Moderation API
- **Icons**: Lucide React

---

## 🚀 Setup & Installation

### 1. Prerequisites
- Node.js installed.
- A Supabase account and project.
- An OpenAI API key.

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Schema Setup (Supabase)
Navigate to your Supabase project dashboard, open the **SQL Editor**, and run the queries found in the [`schema.sql`](./schema.sql) file. This will set up the tables (`profiles`, `diaries`, `likes`, `comments`, `favorites`, `chats`) and RLS (Row Level Security) policies, along with a trigger that creates a profile entry automatically when a user signs up.

### 4. Configuration
Create a `.env.local` file in the root directory (based on `.env.local.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

### 5. Running the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view it.
