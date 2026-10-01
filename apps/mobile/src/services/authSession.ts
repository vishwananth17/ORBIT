import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { safeStorage } from '../utils/safeStorage';

let client: SupabaseClient | null = null;
export function getAuthClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Sign-in is not configured.');
  client = createClient(url, key, { auth: {
    storage: { getItem: safeStorage.getItem, setItem: safeStorage.setItem, removeItem: safeStorage.deleteItem },
    storageKey: 'orbit_supabase_session', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
  } });
  return client;
}

// Legacy releases kept only an access token, not its refresh token. Verify it,
// but never silently keep an expired legacy session or fall back to dev access.
export async function getValidAccessToken(legacyToken?: string | null): Promise<string | null> {
  if (legacyToken === 'dev-token' && process.env.EXPO_PUBLIC_DEMO_MODE === 'true') return legacyToken;
  const auth = getAuthClient();
  const { data, error } = await auth.auth.getSession();
  if (error) throw new Error('Your Orbit session expired. Please sign in again.');
  const session = data.session;
  if (session) {
    if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
      const refreshed = await auth.auth.refreshSession();
      if (refreshed.error || !refreshed.data.session) throw new Error('Your Orbit session expired. Please sign in again.');
      return refreshed.data.session.access_token;
    }
    return session.access_token;
  }
  if (!legacyToken) return null;
  const verified = await auth.auth.getUser(legacyToken);
  if (verified.error || !verified.data.user) throw new Error('Your Orbit session expired. Please sign in again.');
  return legacyToken;
}
