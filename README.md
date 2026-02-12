# Happy Aquarium

A Three.js aquarium game MVP: buy/sell fish, breed them, upgrade your tank, place decorations, earn daily credits, and add friends. Backend: Supabase (Auth, PostgreSQL, Edge Functions).

## Setup

### Option A: Local development (recommended to start)

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker (required for local Supabase).

2. Start Supabase locally (runs migrations and seed automatically):
   ```bash
   npx supabase start
   ```
   Note the API URL and anon key in the output, or use the defaults below.

3. Copy `.env.example` to `.env`. For local dev the example already points at `http://127.0.0.1:54321` and the default local anon key.

4. Install and run the app:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:5173. Sign up with any email/password (no confirmation in local auth).

5. (Optional) Run Edge Functions locally:
   ```bash
   npx supabase functions serve
   ```
   Then call the daily-credit function from the app (Claim daily). For breeding, invoke `process-breeding` with the local service role key (see `npx supabase status`).

### Option B: Hosted Supabase

1. Create a [Supabase](https://supabase.com) project and enable Email and (optionally) Google/GitHub auth.

2. Run migrations and seed:
   ```bash
   npx supabase link --project-ref YOUR_REF
   npx supabase db push
   ```
   Or run the SQL in `supabase/migrations/` and `supabase/seed.sql` in the SQL editor.

3. Copy `.env.example` to `.env` and set your project’s:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. Install and run the app:
   ```bash
   npm install
   npm run dev
   ```

5. (Optional) Deploy Edge Functions and schedule breeding:
   ```bash
   npx supabase functions deploy daily-credit
   npx supabase functions deploy process-breeding
   ```
   Schedule `process-breeding` (e.g. every 6–12h) via Supabase Dashboard or a cron that calls the function URL with `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`.

## Features (MVP)

- **Auth**: Email/password and social (Google, GitHub)
- **Aquarium**: One tank per user; upgrade (small → medium → large) with credits
- **Fish**: Buy (up to 10), sell at desired price (capped), feed and medicine from inventory
- **Behavior**: Fish swim and group by species in the 3D tank
- **Breeding**: Backend Edge Function runs on a schedule; environment (hunger/health) and chance can produce rare offspring
- **Decorations**: Buy and place (up to 10); move via panel (position/rotation saved)
- **Daily credits**: Claim once per day via Edge Function
- **Friends**: Send/accept/reject friend requests; list friends (by display name / ID)

## Limits

- 10 fish and 10 decorations per tank (enforced in DB and UI).
