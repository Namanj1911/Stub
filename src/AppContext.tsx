// App-wide data context. Screens are rendered by react-navigation, so they
// read the store from context instead of prop drilling through navigators.

import React, { createContext, useContext } from 'react';
import { useAppData } from './store';

type AppStore = ReturnType<typeof useAppData>;

const AppContext = createContext<AppStore | null>(null);

export function AppProvider({
  store,
  children,
}: {
  store: AppStore;
  children: React.ReactNode;
}) {
  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// Screens behind the profile gate can assume a profile exists.
export function useProfile() {
  const { data } = useApp();
  if (!data.profile) throw new Error('useProfile called before setup completed');
  return data.profile;
}
