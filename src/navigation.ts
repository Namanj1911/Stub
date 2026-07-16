// Navigation route types. Tabs live inside the root stack; Backfill,
// Nicotine and SOS slide over the tabs as full-screen pushes.

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

export type RootStackParamList = {
  Tabs: undefined;
  Backfill: undefined;
  Nicotine: undefined;
  Sos: undefined;
};

export type TabParamList = {
  Log: undefined;
  Stats: undefined;
  Goal: undefined;
  Money: undefined;
};

// Tab screens navigate to root-stack routes; unhandled actions bubble to the
// parent stack, so one root-typed hook serves every screen.
export function useNav() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
