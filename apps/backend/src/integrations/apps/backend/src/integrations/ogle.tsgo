import crypto from 'crypto';
import { query } from '../db';
import { encryptToken, decryptToken } from '../tools/crypto';

// Initial rollout is read-only. Sending and calendar writes remain disabled.
export const GOOGLE_SCOPES: Record<string, string> = {
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  google_calendar: 'https://www.googleapis.com/auth/calendar.events.readonly',
};

function settings() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Orbit Google OAuth is not configured');
  return { clientId, clientSecret, redirectUri };
}

export async function beginGoogleConnect(userId: string, provider: string): Promise<string> {
  if (!GOOGLE_SCOPES[provider]) throw new Error('Only Gmail and Google Calendar are supported');
  const cfg = settings();
  const state = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(32).toString('base64url');
  await query(`INSERT INTO oauth_states (state_hash, user_id, provider, encrypted_verifier, expires_at)
    VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')`,
    [crypto.createHash('sha256').update(state).digest('hex'), userId, provider, encryptToken(verifier)]);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: cfg.redirectUri,
    response_type: 'code', scope: GOOGLE_SCOPES[provider], state, access_type: 'offline',
    prompt: 'consent', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256' }).toString();
  return url.toString();
}

async function tokenRequest(fields: Record<string, string>): Promise<any> {
  const cfg = settings();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...fields, client_id: cfg.clientId, client_secret: cfg.clientSecret }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json() as any;
  if (!res.ok || !data.access_token) throw new Error('Google authorization failed. Please reconnect.');
  return data;
}

export async function finishGoogleConnect(state: string, code: string) {
  const cfg = settings();
  const claimed = await query(`DELETE FROM oauth_states WHERE state_hash = $1 AND expires_at > NOW()
    RETURNING user_id, provider, encrypted_verifier`, [crypto.createHash('sha256').update(state).digest('hex')]);
  const row = claimed.rows[0];
  if (!row) throw new Error('Authorization link expired or was already used');
  const data = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: cfg.redirectUri,
    code_verifier: decryptToken(row.encrypted_verifier) });
  const scopes = String(data.scope || '').split(' ');
  if (!scopes.includes(GOOGLE_SCOPES[row.provider])) throw new Error('Required Google read permission was not granted');
  await query(`INSERT INTO integrations (user_id, provider, encrypted_access_token, encrypted_refresh_token,
    token_expiry, scopes, is_active) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
    ON CONFLICT (user_id, provider) DO UPDATE SET encrypted_access_token = EXCLUDED.encrypted_access_token,
    encrypted_refresh_token = COALESCE(EXCLUDED.encrypted_refresh_token, integrations.encrypted_refresh_token),
    token_expiry = EXCLUDED.token_expiry, scopes = EXCLUDED.scopes, is_active = TRUE, updated_at = NOW()`,
    [row.user_id, row.provider, encryptToken(data.access_token),
      data.refresh_token ? encryptToken(data.refresh_token) : null,
      new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString(), scopes]);
}

export async function googleRead(userId: string, provider: string, path: string) {
  const result = await query('SELECT * FROM integrations WHERE user_id = $1 AND provider = $2 AND is_active = TRUE',
    [userId, provider]);
  const row = result.rows[0];
  if (!row || !row.scopes?.includes(GOOGLE_SCOPES[provider])) throw new Error('Connect your Google account first');
  let accessToken = decryptToken(row.encrypted_access_token);
  if (!row.token_expiry || new Date(row.token_expiry).getTime() <= Date.now() + 60000) {
    if (!row.encrypted_refresh_token) throw new Error('Google session expired. Please reconnect.');
    const data = await tokenRequest({ grant_type: 'refresh_token', refresh_token: decryptToken(row.encrypted_refresh_token) });
    accessToken = data.access_token;
    await query('UPDATE integrations SET encrypted_access_token = $1, token_expiry = $2 WHERE id = $3',
      [encryptToken(accessToken), new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString(), row.id]);
  }
  const url = new URL(path, 'https://www.googleapis.com');
  if (url.origin !== 'https://www.googleapis.com') throw new Error('Invalid provider URL');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Google request failed (${response.status}). No result was verified.`);
  return response.json() as Promise<any>;
}

export async function searchGoogleEmails(userId: string, args: Record<string, unknown>) {
  const search = new URLSearchParams({ q: String(args.query || ''),
    maxResults: String(Math.max(1, Math.min(20, Number(args.max_results) || 5))) });
  const page = await googleRead(userId, 'gmail', `/gmail/v1/users/me/messages?${search}`);
  const messages = [];
  for (const item of page.messages || []) {
    const msg = await googleRead(userId, 'gmail', `/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=metadata`);
    const header = (name: string) => msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === name)?.value || '';
    messages.push({ id: msg.id, thread_id: msg.threadId, from: header('from'), subject: header('subject'),
      date: header('date'), snippet: msg.snippet, source: 'gmail', untrusted_content: true });
  }
  return { messages, source: 'gmail', next_page_token: page.nextPageToken };
}

export async function readGoogleCalendar(userId: string, args: Record<string, unknown>) {
  const params = new URLSearchParams({ timeMin: String(args.time_min || new Date().toISOString()),
    singleEvents: 'true', orderBy: 'startTime', maxResults: '50' });
  if (args.time_max) params.set('timeMax', String(args.time_max));
  if (args.query) params.set('q', String(args.query));
  const page = await googleRead(userId, 'google_calendar', `/calendar/v3/calendars/primary/events?${params}`);
  return { events: page.items || [], source: 'google_calendar', untrusted_content: true };
}
