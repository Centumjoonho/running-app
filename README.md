# Myle

Myle is an Expo/React Native running app that records GPS routes, stores run history in Supabase, and generates recommended loop courses with a Supabase Edge Function backed by Mapbox.

## Requirements

- Node.js and npm
- Expo CLI through `npx expo`
- Supabase project
- Mapbox access token for the `generate-running-route` Edge Function

## Setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the public Supabase values.

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

3. Start the app.

   ```bash
   npx expo start
   ```

## OAuth Redirects

Development builds and store builds use:

```text
myle://auth/callback
```

Expo Go uses the current Metro host when available. If you need to pin the Expo Go callback manually, set:

```bash
EXPO_PUBLIC_EXPO_GO_REDIRECT_URI=exp://your-host:8081/--/auth/callback
```

Register the exact redirect URI in Supabase Authentication settings for Google and Kakao login.

## Supabase

Apply the schema in `supabase/run_schema.sql` to create:

- `run_sessions`
- `run_points`
- RLS policies for authenticated users to access only their own runs

Set the Mapbox secret for the Edge Function:

```bash
supabase secrets set MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

Deploy the route generator with JWT verification enabled:

```bash
supabase functions deploy generate-running-route
```

The client calls this function with the current Supabase session access token.

## Useful Commands

```bash
npm run lint
npx tsc --noEmit
npx expo start
```
