// The app's few ways out (R10): the privacy policy, the support inbox, and
// the national quit line. One file so the address and the number are each
// written down once.

import { Alert, Linking, Platform } from 'react-native';
import appJson from '../app.json';
import { copy, supportMailto } from './strings';

export const PRIVACY_URL = 'https://namanj1911.github.io/Stub/';
export const SUPPORT_EMAIL = 'stubapp.help@gmail.com';
// India's National Tobacco Quit Line: toll-free, run by the health ministry,
// and the number printed on every pack. Checked 2026-11-16 against ntqls.in.
// Sources differ on its hours, so the app does not print any.
export const QUIT_LINE = '1800-11-2356';

export const APP_VERSION: string = appJson.expo.version;

// A phone with no mail app or no dialler (a tablet, the simulator) rejects
// the URL. Say what we were trying to open so the user can still use it.
function open(url: string, fallback: string) {
  Linking.openURL(url).catch(() => Alert.alert(copy('linkFailedTitle'), fallback));
}

export const openPrivacy = () => open(PRIVACY_URL, PRIVACY_URL);

export const openSupportEmail = () =>
  open(
    supportMailto(SUPPORT_EMAIL, APP_VERSION, `${Platform.OS} ${Platform.Version}`),
    SUPPORT_EMAIL,
  );

export const callQuitLine = () => open(`tel:${QUIT_LINE.replace(/-/g, '')}`, QUIT_LINE);
