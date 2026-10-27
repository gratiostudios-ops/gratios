import * as WebBrowser from 'expo-web-browser';
import { gateway } from './Auth';
import type { Session } from '../data/api';
import { runGoogleSignIn } from './google-flow';

WebBrowser.maybeCompleteAuthSession();

// https://supabase.com/docs/guides/auth/native-mobile-deep-linking
export async function googleSignIn(): Promise<Session | null> {
  const configuration = await gateway.request<{ supabaseUrl: string; supabaseKey: string }>('/auth/google/config', {}, false);
  return runGoogleSignIn(configuration, WebBrowser.openAuthSessionAsync,
    accessToken => gateway.request('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } }, false));
}
