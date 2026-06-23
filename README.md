# ThisIsMyCard

Premium NFC Digital Business Card onboarding portal & admin dashboard.

**Live App**: [Deploy to Vercel](#deploy-to-vercel)  
**GitHub**: https://github.com/aqlhzm/thisismycard

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js Server Actions
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (profile photos)
- **Auth**: Server-side admin credentials via env vars
- **Deploy**: Vercel (Singapore region)

## Features

### Customer Portal
- Landing page with animated NFC card hero
- 4-step registration form
- Live card color preview (8 colors)
- Profile photo upload
- Submission confirmation

### Admin Dashboard
- Secure login
- Stats overview (Total / New / Pending / Production / Shipped / Completed)
- Orders table with search + filter
- Customer profile modal
- Status update workflow (6 stages)

## Setup

### 1. Supabase Schema

Run this SQL in your Supabase project (SQL Editor):

```sql
-- See: supabase/migrations/001_initial_schema.sql
```

Or copy-paste the full migration file from `supabase/migrations/001_initial_schema.sql`.

### 2. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://zqaxufcfappmlqldjryb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_EMAIL=admin@thisismycard.io
ADMIN_PASSWORD=your_secure_password
```

### 3. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aqlhzm/thisismycard&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ADMIN_EMAIL,ADMIN_PASSWORD&envDescription=Supabase%20and%20admin%20credentials&project-name=thisismycard&repository-name=thisismycard)

Or manually:
1. Go to https://vercel.com/new
2. Import `aqlhzm/thisismycard`
3. Add environment variables above
4. Deploy

## Local Development

```bash
npm install
cp .env.example .env.local  # fill in your values
npm run dev
```

## Admin Access

- URL: `/` → click "Admin Portal" in footer
- Default email: `admin@thisismycard.io`
- Password: set via `ADMIN_PASSWORD` env var
