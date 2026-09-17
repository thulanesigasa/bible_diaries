# Hyperframes Composition Brief: Bible Diaries Web Application

## Objective
Create a short, polished launch-style brag video for the Bible Diaries web application.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 18.0 seconds

## Source Material
- Project root: `D:\workspace_programming\websites\bible_diaries`
- Primary files read: `README.md`, `package.json`, `src/app/globals.css`, `src/app/feed/page.js`, `src/app/settings/page.js`
- Product name: Bible Diaries
- Tagline / strongest claim: "Where Believers Reflect & Connect — Aligning Hearts Everywhere"
- Key UI or visual moment to recreate:
  - Scripture Reflection card: Proverbs 3:5-6 "Trust in the Lord with all your heart...", Author Grace Mwangi, Wisdom category tag, plain text metrics (42 Likes, 8 Notes, Saved).
  - Category filter bar: Hope, Faith, Love, Strength, Gratitude, Wisdom.
  - Plain-text UI interactions with zero SVGs, zero emojis, and zero status badges.
- Copy that must appear verbatim:
  - "Bible Diaries"
  - "Where Believers Reflect & Connect"
  - "Proverbs 3:5-6"
  - "Trust in the Lord with all your heart"
  - "Aligning hearts everywhere."

## Creative Direction
- Tone preset: polished
- Creative direction: Refined spiritual reflection and modern web craft
- Interpretation: Crisp typography, elegant layout, serene contrast, and uplifting rhythm.
- Angle: Showcase a real spiritual journaling web application that combines sacred reflection with state-of-the-art web engineering (Next.js 16, React 19, Supabase, OpenAI moderation).
- Hook: 0-3.5s: Luminous brand entrance on pure white canvas.
- Outro: 14-18s: Final brand mark with tagline "Aligning hearts everywhere."
- Avoid:
  - Generic SaaS buzzwords ("streamline your workflow", "all-in-one platform")
  - Abstract 3D filler shapes
  - Status badges, indicator tags, or pill badges (Rule 16)
  - Emojis anywhere in copy or UI
  - SVG icons anywhere in UI (plain text only)
  - Dark mode backgrounds (clean white #FFFFFF only)

## Visual Identity
- Background: #FFFFFF (Clean White) with subtle soft vignette
- Surface: #F8FAFC / #FFFFFF (Pure White Cards with soft hairline borders `rgba(15, 23, 42, 0.08)`)
- Text Primary: #0F172A (Deep Slate)
- Text Secondary: #475569 / #64748B
- Accent: #0284C7 / #0EA5E9 (Sky Blue)
- Display font: Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- Body font: Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

## Storyboard
See `brag-plan.md` for full beat contract.
1. Scene 1 - The Sanctuary Hook (0.0s - 3.5s): Brand reveal & Spiritual Promise.
2. Scene 2 - Scripture Reflection Feed (3.5s - 8.5s): Desktop web reflection card with live scripture passage.
3. Scene 3 - Categories & Fellowship (8.5s - 14.0s): Category filter cascade with active Wisdom pill & fellowship cards.
4. Scene 4 - Outro (14.0s - 18.0s): Clean brand lockup with "Aligning hearts everywhere."

## Audio
- Audio role: Warm, uplifting rhythmic bed
- Music: `assets/music/music.mp3`
- Music treatment: Starts at 0s at volume 0.8; smooth fade-out from 16.0s to 18.0s.
- SFX files:
  - `assets/sfx/switch1.ogg`
  - `assets/sfx/switch3.ogg`
  - `assets/sfx/click1.ogg`
  - `assets/sfx/rollover1.ogg`
- Music cue guidance: 109.96 BPM tempo; beat grid intervals ~0.54s. Major reveals lock to strong beats at 3.55s, 8.73s, and 14.20s.
- Audio-coupled moments: Category cards popping in, reflection card entry, final logo lock.

## Hyperframes Instructions
- Composition directory: `brag-output/composition/`
- Render target: `brag-output/brag.mp4`
- Landscape format: 1920x1080
- Total duration: 18.0s (540 frames at 30fps)
- Must pass `npx hyperframes check` with 0 errors, 0 warnings, and 100% WCAG AA contrast compliance.