import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiError, GatewayClient, type Session, type TokenStorage } from '../data/api';

export const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
const storageKey = 'avocado.refresh-token.v1';
// Native APIs: https://docs.expo.dev/versions/v58.0.0/sdk/securestore/
// Browser preview keeps credentials in memory; Android uses encrypted storage.
let webToken: string | null = null;
const storage: TokenStorage = {
  get: () => Platform.OS === 'web' ? Promise.resolve(webToken) : SecureStore.getItemAsync(storageKey),
  set: token => Platform.OS === 'web' ? Promise.resolve(void (webToken = token)) : SecureStore.setItemAsync(storageKey, token),
  clear: () => Platform.OS === 'web' ? Promise.resolve(void (webToken = null)) : SecureStore.deleteItemAsync(storageKey),
};
export const gateway = new GatewayClient(process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://127.0.0.1:4104', storage);
type AuthState = { ready: boolean; signedIn: boolean; identity: number; restoringError: string | null; retryRestore(): void; accept(session: Session): Promise<void>; logout(): Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(demoMode);
  const [signedIn, setSignedIn] = useState(demoMode);
  const [identity, setIdentity] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [restoringError, setRestoringError] = useState<string | null>(null);
  const authOperation = useRef(0);
  useEffect(() => {
    if (demoMode) return;
    const operation = ++authOperation.current;
    let active = true;
    gateway.onSessionLost = () => { if (active) { setSignedIn(false); setIdentity(value => value + 1); } };
    setReady(false); setRestoringError(null);
    gateway.restore().then(result => { if (active && operation === authOperation.current) setSignedIn(result); }).catch(async error => {
      if (!active || operation !== authOperation.current) return;
      if (error instanceof ApiError && error.status === 401) await gateway.logout();
      else if (active) setRestoringError(error instanceof Error ? error.message : 'Could not restore your session.');
    }).finally(() => { if (active && operation === authOperation.current) setReady(true); });
    return () => { active = false; gateway.onSessionLost = undefined; };
  }, [attempt]);
  return <AuthContext.Provider value={{ ready, signedIn, identity, restoringError, retryRestore: () => setAttempt(value => value + 1),
    accept: async session => { authOperation.current++; await gateway.accept(session); setIdentity(value => value + 1); setSignedIn(true); setReady(true); },
    logout: () => { authOperation.current++; return gateway.logout(); },
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error('AuthProvider required'); return auth; }
