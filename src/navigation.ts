// Navigation route types. Tabs live inside the root stack; Backfill,
// Nicotine, SOS, Profile and Health slide over the tabs as full-screen pushes.

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

export type TabParamList = {
  Log: undefined;
  Stats: undefined;
  Goal: undefined;
  Money: undefined;
};

export type RootStackParamList = {
  // Params-typed rather than `undefined` so a notification tap can deep-link
  // straight to a tab: navigate('Tabs', { screen: 'Stats' }).
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Backfill: undefined;
  Nicotine: undefined;
  Sos: undefined;
  Profile: undefined;
  Health: undefined;
};

// Tab screens navigate to root-stack routes; unhandled actions bubble to the
// parent stack, so one root-typed hook serves every screen.
export function useNav() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
