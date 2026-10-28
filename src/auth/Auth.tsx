import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { mobileCache } from '../data/mobile-cache';
import { ApiError, GatewayClient, type Session, type TokenStorage } from '../data/api';

export const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
const storageKey = 'avocado.refresh-token.v1';
const sessionKey = 'avocado.session.v1';
// Native APIs: https://docs.expo.dev/versions/v58.0.0/sdk/securestore/
// Browser preview keeps credentials in memory; Android uses encrypted storage.
let webToken: string | null = null;
let webSession: string | null = null;
const storage: TokenStorage = {
  get: () => Platform.OS === 'web' ? Promise.resolve(webToken) : SecureStore.getItemAsync(storageKey),
  set: token => Platform.OS === 'web' ? Promise.resolve(void (webToken = token)) : SecureStore.setItemAsync(storageKey, token),
  getSession: () => Platform.OS === 'web' ? Promise.resolve(webSession) : SecureStore.getItemAsync(sessionKey),
  setSession: value => Platform.OS === 'web' ? Promise.resolve(void (webSession = value)) : SecureStore.setItemAsync(sessionKey, value),
  clear: async () => {
    if (Platform.OS === 'web') { webToken = null; webSession = null; }
    else await Promise.all([SecureStore.deleteItemAsync(storageKey), SecureStore.deleteItemAsync(sessionKey)]);
  },
};
export const gateway = new GatewayClient(process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://127.0.0.1:4104', storage);
type AuthState = { ready: boolean; signedIn: boolean; identity: number; restoringError: string | null; requiresSignIn: boolean; reconnect(): Promise<void>; retryRestore(): void; accept(session: Session): Promise<void>; logout(): Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(demoMode);
  const [signedIn, setSignedIn] = useState(demoMode);
  const [identity, setIdentity] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [restoringError, setRestoringError] = useState<string | null>(null);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const authOperation = useRef(0);
  useEffect(() => {
    if (demoMode) return;
    const operation = ++authOperation.current;
    let active = true;
    gateway.onSessionLost = () => { if (active) { setRequiresSignIn(true); setRestoringError('Sign in again to update your cached data.'); } };
    setRestoringError(null);
    void (async () => {
      const cached = await gateway.restoreCached().catch(() => false);
      if (!active || operation !== authOperation.current) return;
      if (cached) { setSignedIn(true); setReady(true); }
      try {
        if (cached) await gateway.revalidate();
        else {
          const restored = await gateway.restore();
          if (active && operation === authOperation.current) setSignedIn(restored);
        }
        if (active && operation === authOperation.current) setRequiresSignIn(false);
      } catch (error) {
        if (!active || operation !== authOperation.current) return;
        setRestoringError(error instanceof Error ? error.message : 'Could not restore your session.');
        if (error instanceof ApiError && error.status === 401) setRequiresSignIn(true);
      } finally { if (active && operation === authOperation.current) setReady(true); }
    })();
    return () => { active = false; gateway.onSessionLost = undefined; };
  }, [attempt]);
  return <AuthContext.Provider value={{ ready, signedIn, identity, restoringError, requiresSignIn, reconnect: async () => {
    const session = await (await import('./google')).googleSignIn();
    if (!session) return;
    const previous = gateway.cacheIdentity;
    authOperation.current++; await gateway.accept(session);
    if (previous && previous !== gateway.cacheIdentity) await mobileCache.clear(previous);
    setRequiresSignIn(false); setRestoringError(session.notice ?? null); setSignedIn(true); setReady(true); setIdentity(value => value + 1);
  }, retryRestore: () => setAttempt(value => value + 1),
    accept: async session => { const previous = gateway.cacheIdentity; authOperation.current++; await gateway.accept(session); if (previous && previous !== gateway.cacheIdentity) await mobileCache.clear(previous); setRequiresSignIn(false); setRestoringError(session.notice ?? null); setIdentity(value => value + 1); setSignedIn(true); setReady(true); },
    logout: async () => {
      const operation = ++authOperation.current;
      const previous = gateway.cacheIdentity;
      // Start best-effort device removal with the current credential, then invalidate
      // local credentials and cache before exposing a new sign-in screen.
      const removal = demoMode ? Promise.resolve() : gateway.request('/gateway/device', { method: 'DELETE' }).catch(() => {});
      const notifications = import('../notifications').then(module => module.cancelPhonePushRegistrations());
      await Promise.all([gateway.logout(), mobileCache.clear(previous), notifications]);
      if (operation === authOperation.current) { setSignedIn(false); setRequiresSignIn(false); setIdentity(value => value + 1); }
      void removal;

    },
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error('AuthProvider required'); return auth; }
