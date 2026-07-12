# Austin's Diary

A private, mobile-first caregiving diary for tracking daily life with a child with autism. Built with React + TypeScript, Tailwind CSS, and Supabase.

## Features

- **Secure auth** — email/password sign-in via Supabase Auth
- **Private by design** — Row-Level Security ensures each child's data is only visible to invited caregivers
- **Daily diary entries** — free-text notes, optional photo, and tags (e.g. "good day", "therapy", "meltdown")
- **Calendar view** — browse and edit past entries month by month
- **Child profiles** — manage multiple profiles; invite co-caregivers as owner/editor/viewer
- **Mobile-first** — designed for phone use with a sticky bottom nav and safe-area support

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Auth & DB | Supabase (PostgreSQL + RLS) |
| Forms | react-hook-form + zod |
| Routing | react-router-dom v6 |
| Dates | date-fns |
| Icons | lucide-react |

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In your project dashboard, go to **Settings → API** and copy:
   - `Project URL`
   - `anon / public` key

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the database migration

In your Supabase dashboard, go to **SQL Editor** and paste the contents of:

```
supabase/migrations/001_init.sql
```

This creates:
- `child_profiles` — one row per child
- `profile_access` — which users can access which profiles (owner / editor / viewer roles)
- `diary_entries` — daily journal entries linked to a profile
- Row-Level Security policies on all tables
- A `diary-photos` storage bucket for entry photos

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser (or on your phone via your local IP).

---

## Database schema

```
child_profiles
  id, name, birth_date, avatar_url, created_by, created_at

profile_access
  id, profile_id, user_id, role ('owner'|'editor'|'viewer'), invited_at

diary_entries
  id, profile_id, author_id, entry_date, note, photo_url, tags[], created_at, updated_at
```

### RLS rules (summary)

- **child_profiles**: only users with a `profile_access` row can read/write
- **diary_entries**: same — access is gated through `profile_access`
- **Storage**: authenticated users only; photo paths are namespaced by user ID

---

## Project structure

```
src/
  components/
    auth/         AuthPage (login + register)
    calendar/     CalendarView (month grid with entry dots)
    diary/        DiaryEntryForm, TagInput, PhotoUpload, EntryPreviewCard
    layout/       AppHeader, BottomNav
    profile/      ProfileSetupPage
    ui/           Spinner
  contexts/
    AuthContext   Supabase session management
    ProfileContext active child profile state
  hooks/
    useDiaryEntries  fetch all entries for a profile
  lib/
    supabase.ts   typed Supabase client
  pages/
    DiaryPage     today's entry
    CalendarPage  month calendar + selected-day panel + recent feed
    ProfilePage   manage profiles + sharing
  types/
    database.ts   Supabase Database type
    index.ts      shared app types
supabase/
  migrations/
    001_init.sql  all tables, RLS policies, storage bucket
```

---

## Next steps (planned)

- Behavior tracking module (antecedent → behavior → consequence)
- Diet / nutrition log
- Sensory observations
- Weekly summary view
- Push notifications / reminders
- PWA manifest for "Add to Home Screen"
- Invite-by-email flow (Supabase Edge Function)
