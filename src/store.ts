// S22 local-first storage: everything lives on device in AsyncStorage,
// app is fully functional offline. Writes are fire-and-forget so logging
// stays optimistic (<100ms perceived, NFR1).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Entry, Pace, dayKey } from './domain';

export type Profile = {
  countPerDay: number;
  pace: Pace;
  installDayKey: number;
  // set by later onboarding steps (S13 full / S18 / S21)
  brandId?: string;
  pricePerStick?: number;
  triggers?: string[];
};

export type Craving = {
  id: string;
  timestamp: number;
  outcome: 'survived' | 'smoked';
};

export type AppData = {
  profile: Profile | null;
  entries: Entry[];
  cravings: Craving[];
};

const KEY = 'stub/v1';

const EMPTY: AppData = { profile: null, entries: [], cravings: [] };

export function useAppData() {
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        // spread over EMPTY so data saved by older app versions gains new fields
        if (raw) setData({ ...EMPTY, ...(JSON.parse(raw) as Partial<AppData>) });
      })
      .catch(() => {}) // corrupt/missing store — start fresh rather than crash
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const completeSetup = useCallback(
    (input: {
      countPerDay: number;
      pace: Pace;
      brandId?: string;
      pricePerStick?: number;
      triggers?: string[];
    }) => {
      update((d) => ({
        ...d,
        profile: {
          ...input,
          installDayKey: dayKey(Date.now()),
        },
      }));
    },
    [update],
  );

  const addCraving = useCallback(
    (outcome: 'survived' | 'smoked') => {
      const craving: Craving = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        outcome,
      };
      update((d) => ({ ...d, cravings: [...d.cravings, craving] }));
    },
    [update],
  );

  const setBrandId = useCallback(
    (brandId: string) => {
      update((d) => (d.profile ? { ...d, profile: { ...d.profile, brandId } } : d));
    },
    [update],
  );

  const setPricePerStick = useCallback(
    (pricePerStick: number) => {
      update((d) =>
        d.profile ? { ...d, profile: { ...d.profile, pricePerStick } } : d,
      );
    },
    [update],
  );

  const addEntry = useCallback(
    (sixths: number, timestamp = Date.now(), backfilled = false) => {
      const entry: Entry = {
        id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        sixths,
        timestamp,
        ...(backfilled ? { backfilled: true } : {}),
      };
      update((d) => ({ ...d, entries: [...d.entries, entry] }));
    },
    [update],
  );

  const undoLast = useCallback(() => {
    update((d) => ({ ...d, entries: d.entries.slice(0, -1) }));
  }, [update]);

  const editEntry = useCallback(
    (id: string, sixths: number) => {
      update((d) => ({
        ...d,
        entries: d.entries.map((e) => (e.id === id ? { ...e, sixths } : e)),
      }));
    },
    [update],
  );

  const removeEntry = useCallback(
    (id: string) => {
      update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
    },
    [update],
  );

  const setPace = useCallback(
    (pace: Pace) => {
      update((d) => (d.profile ? { ...d, profile: { ...d.profile, pace } } : d));
    },
    [update],
  );

  return {
    data,
    loaded,
    completeSetup,
    addEntry,
    undoLast,
    editEntry,
    removeEntry,
    addCraving,
    setBrandId,
    setPace,
    setPricePerStick,
  };
}
