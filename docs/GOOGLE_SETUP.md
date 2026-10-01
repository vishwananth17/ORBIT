# Orbit foundation and Google read-access rollout

This branch is for review. It is not production-certified and does not send email or change calendar events.

## Configuration

Use Orbit's own Supabase project for password sign-in and persistent PostgreSQL storage. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY for the client, SUPABASE_URL and SUPABASE_ANON_KEY for the server, and EXPO_PUBLIC_API_URL to the backend URL. Do not expose a service-role key in the app. Run the database migrations, including 004_oauth_states.sql, against the server database.

Create a Google Cloud OAuth web client for Orbit, enable Gmail and Calendar APIs, and add the test user's email to the consent screen while the app is in testing. Register the exact backend URL ending in /oauth/google/callback. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI on the backend only. Generate a unique TOKEN_ENCRYPTION_KEY with openssl rand -hex 32. Store all secrets in private environment settings, never GitHub or chat.

The Google consent flow requests read-only scopes, uses single-use expiring state and PKCE, encrypts tokens at rest and refreshes access tokens. The browser callback exposes no tokens. Return to Orbit and refresh Connected Tools after consent. Disconnect removes the local encrypted credentials; revoke access in Google account settings if you want to revoke the grant itself.

The initial implementation uses the connected Google account's primary calendar and inbox. Multi-account selection, write actions, monitoring of new mail, and reply composition are future work. Email text and calendar descriptions are untrusted data, not permission to act.

## Cost and demo limits

No paid API calls were made during preparation. Google's API/OAuth preparation is separate from model inference costs. Existing Anthropic/OpenAI paths need keys and may bill usage. Do not activate those without approving costs. No billing account or paid hosting is required by this patch.

DEMO_MODE=true and EXPO_PUBLIC_DEMO_MODE=true explicitly enable offline simulation for development only. Never attach private accounts to a demo instance. Production forbids demo mode. Without a working persistent database or embedding provider, the server now fails instead of claiming durable semantic memory.

## Verification before merge

- Build shared/database/backend, run backend suites, typecheck mobile, export web.
- Verify a valid password login and rejection of invalid passwords and expired tokens.
- Verify two different users cannot read/write each other's conversations.
- Run actual PostgreSQL migration and restart persistence tests, not just the in-memory test store.
- Configure OAuth on a private test deployment and inspect Google consent, callback, read results, refresh and disconnect.
- Verify missing provider configuration, network failures and denied consent never show connected/sent/completed.
- Check full recipient/body/CC preview before enabling any future write path.
- Inspect phone and desktop previews. A static web build does not validate a deployed backend.

Official reference: https://developers.google.com/identity/protocols/oauth2/web-server
Gmail list API: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
