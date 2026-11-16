// App-wide data context. Screens are rendered by react-navigation, so they
// read the store from context instead of prop drilling through navigators.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useAppData } from './store';

type AppStore = ReturnType<typeof useAppData>;

const AppContext = createContext<AppStore | null>(null);

// One shared clock (R9, 2026-11-16). Screens used to read Date.now() during
// render and only re-render when the store changed, and tabs stay mounted — so
// an app reopened the next morning without a cold start still showed last
// night's count and "budget torched" until something was logged. Log's own
// one-minute timer did not help: timers are paused in the background and the
// next tick lands up to a minute after the return.
//
// Every screen reads the time from here. It moves once a minute, and at once
// when the app returns to the foreground, so the 4am day rollover and the
// first cigarette of the morning both see a clean slate.
type Clock = { now: number; refresh: () => void };

const ClockContext = createContext<Clock | null>(null);

const CLOCK_TICK_MS = 60_000;

function useClockState(): Clock {
  const [now, setNow] = useState(Date.now);
  const refresh = useCallback(() => setNow(Date.now()), []);
  useEffect(() => {
    const tick = setInterval(refresh, CLOCK_TICK_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
  }, [refresh]);
  return useMemo(() => ({ now, refresh }), [now, refresh]);
}

export function AppProvider({
  store,
  children,
}: {
  store: AppStore;
  children: React.ReactNode;
}) {
  const clock = useClockState();
  return (
    <AppContext.Provider value={store}>
      <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>
    </AppContext.Provider>
  );
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// The shared "now" (epoch ms). Derive the day key from this, never from a
// Date.now() read during render.
export function useNow(): number {
  return useClock().now;
}

// Pull the clock forward immediately — for the moment right after a write,
// when "since last" must not wait for the next tick.
export function useRefreshNow(): () => void {
  return useClock().refresh;
}

function useClock(): Clock {
  const ctx = useContext(ClockContext);
  if (!ctx) throw new Error('useNow must be used inside AppProvider');
  return ctx;
}

// Screens behind the profile gate can assume a profile exists.
export function useProfile() {
  const { data } = useApp();
  if (!data.profile) throw new Error('useProfile called before setup completed');
  return data.profile;
}
