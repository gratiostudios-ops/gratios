import * as WebBrowser from 'expo-web-browser';
import { gateway } from './Auth';
import type { Session } from '../data/api';
import { runGoogleSignIn } from './google-flow';

WebBrowser.maybeCompleteAuthSession();

// https://supabase.com/docs/guides/auth/native-mobile-deep-linking
export async function googleSignIn(gmailAccess?: boolean, calendarAccess = false): Promise<Session | null> {
  const configuration = await gateway.request<{ supabaseUrl: string; supabaseKey: string }>('/auth/google/config', {}, false);
  return runGoogleSignIn(configuration, WebBrowser.openAuthSessionAsync,
    accessToken => gateway.request('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } }, false), fetch, {
      gmailAccess,
      calendarAccess,
      providerSession: async (appToken, accessToken, refreshToken) => {
        const headers = { Authorization: `Bearer ${appToken}` };
        if (gmailAccess !== undefined) await gateway.request('/gateway/onboarding', { method: 'POST', headers, body: JSON.stringify({ gmailAccess }) }, false);
        if (!gmailAccess && !calendarAccess) return;
        if (!accessToken || !refreshToken) throw new Error('Google offline consent was incomplete.');
        if (gmailAccess) await gateway.request('/integrations/gmail/session', { method: 'POST', headers, body: JSON.stringify({ accessToken, refreshToken }) }, false);
        if (calendarAccess) await gateway.request('/integrations/calendar/session', { method: 'POST', headers, body: JSON.stringify({ accessToken, refreshToken }) }, false);
      },
    });
}
