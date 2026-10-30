import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { gateway, demoMode } from '../auth/Auth';
import { createMarketplaceClient, type OwnListing, type Installation } from './marketplace';

function useMarketplaceData() {
  const api = useMemo(() => createMarketplaceClient(gateway), []);
  const [mine, setMine] = useState<OwnListing[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const active = useRef(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    if (demoMode) return;
    const current = ++generation.current;
    setLoading(true);
    try {
      const [owned, installed] = await Promise.all([api.mine(), api.installations()]);
      if (!active.current || current !== generation.current) return;
      setMine(owned.listings); setInstallations(installed.installations); setError(''); setRevision(value => value + 1);
    } catch (failure) {
      if (active.current && current === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load your agents.');
      throw failure;
    } finally { if (active.current && current === generation.current) setLoading(false); }
  }, [api]);
  useEffect(() => {
    active.current = true;
    void reload().catch(() => {});
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void reload().catch(() => {}); });
    return () => { active.current = false; generation.current++; subscription.remove(); };
  }, [reload]);
  return { api, mine, installations, error, loading, revision, reload };
}
const Context = createContext<ReturnType<typeof useMarketplaceData> | null>(null);
export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const value = useMarketplaceData();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMarketplace() { const value = useContext(Context); if (!value) throw new Error('MarketplaceProvider is required'); return value; }
