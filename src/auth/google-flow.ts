import { createClient } from '@supabase/supabase-js';
import type { Session } from '../data/api';

export const googleRedirect = 'avocado://auth/callback';
type Configuration = { supabaseUrl: string; supabaseKey: string };
type BrowserResult = { type: string; url?: string };

// https://supabase.com/docs/guides/auth/native-mobile-deep-linking
export async function runGoogleSignIn(configuration: Configuration,
  openBrowser: (url: string, redirect: string) => Promise<BrowserResult>,
  verify: (accessToken: string) => Promise<unknown>, transport: typeof fetch = fetch): Promise<Session | null> {
  const client = createClient(configuration.supabaseUrl, configuration.supabaseKey, {
    auth: { flowType: 'pkce', autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => transport(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }) },
  });
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: googleRedirect, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) throw new Error('Could not start Google sign-in. Enable Google in Supabase Authentication.');
  const result = await openBrowser(data.url, googleRedirect);
  if (result.type !== 'success') return null;
  const callback = new URL(result.url ?? '');
  if (callback.protocol !== 'avocado:' || callback.hostname !== 'auth' || callback.pathname !== '/callback') throw new Error('Unexpected sign-in callback. Please try again.');
  const code = callback.searchParams.get('code');
  if (!code || callback.searchParams.has('error')) throw new Error('Google sign-in was not completed. Please try again.');
  const exchanged = await client.auth.exchangeCodeForSession(code);
  if (exchanged.error || !exchanged.data.session) throw new Error('Google sign-in expired. Please try again.');
  const session = exchanged.data.session;
  await verify(session.access_token);
  return { access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, token_type: session.token_type };
}
