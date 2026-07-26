import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  DarkTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider } from './src/AppContext';
import { RootStackParamList, TabParamList } from './src/navigation';
import { useNotificationSync, useNotificationTaps } from './src/notifications';
import { BackfillScreen } from './src/screens/BackfillScreen';
import { BudgetHoldSheet } from './src/screens/BudgetHoldSheet';
import { GoalScreen } from './src/screens/GoalScreen';
import { HealthScreen } from './src/screens/HealthScreen';
import { LogScreen } from './src/screens/LogScreen';
import { MoneyScreen } from './src/screens/MoneyScreen';
import { NicotineScreen } from './src/screens/NicotineScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { SosScreen } from './src/screens/SosScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { useAppData } from './src/store';
import { color, font } from './src/theme';

// Crash reporting (GO_LIVE.md §6). Inert until a DSN is supplied via
// EXPO_PUBLIC_SENTRY_DSN — no Sentry project yet means no init, no network, no
// change to the "Data Not Collected" privacy label. When it does turn on,
// sendDefaultPii stays false so crash data is never linked to a person: an 18+
// health app's crash telemetry must stay anonymous.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
  });
}

// Hold the native splash over the fonts+store load instead of the bare dark
// View this used to flash — launch goes splash → first screen with no blank
// frame. Failure is fine to swallow: worst case the splash just auto-hides.
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<TabParamList>();

// Notification taps navigate from outside the tree, so they need a ref rather
// than the useNav() hook every screen uses.
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: color.accent,
    background: color.bg,
    card: color.bg,
    text: color.text,
    border: color.neutral900,
  },
};

// Tab icons (redesigned 2026-07-26, fresh-eyes UX finding #5). The old
// square/circle/diamond/coin geometric marks read as decoration, not
// navigation — both testers used the labels and never the icons. Each icon now
// depicts its tab's job in a thin outline: a brand cigarette (custom, see
// CigaretteIcon) for the Log tab, then Feather glyphs (already the app's
// line-icon family, see LogScreen) — bar chart = stats, target = the quit goal,
// a ₹ coin = money. Inactive lifted neutral700→neutral500 to match the label
// tone and stay legible. Labels stay; the icons now earn their place beside them.
// The brand-forward Log mark: a horizontal cigarette distilled from the app
// icon (assets/icon.svg) — a stick, a filter band, and the signature lit ember.
// The ember lights warm (#e8956b, the brand's ember) when the tab is selected;
// otherwise the whole mark matches the monochrome Feather set. Drawn at a 24
// viewBox, so it sits at the same visual weight as the other icons.
function CigaretteIcon({ focused }: { focused: boolean }) {
  const c = focused ? color.accent : color.neutral500;
  const ember = focused ? '#e8956b' : c; // brand ember — "still lit" on select
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24">
      <Rect x={6.5} y={9.5} width={13} height={5.5} rx={2} stroke={c} strokeWidth={1.8} fill="none" />
      <Line x1={15.5} y1={9.5} x2={15.5} y2={15} stroke={c} strokeWidth={1.8} />
      <Circle cx={3.6} cy={12.25} r={2} fill={ember} />
    </Svg>
  );
}

function TabIcon({ name, focused }: { name: 'log' | 'stats' | 'goal' | 'money'; focused: boolean }) {
  const c = focused ? color.accent : color.neutral500;
  if (name === 'log') return <CigaretteIcon focused={focused} />;
  if (name === 'stats') return <Feather name="bar-chart-2" size={21} color={c} />;
  if (name === 'goal') return <Feather name="target" size={21} color={c} />;
  // Money — Feather has no rupee, so a coin: an outlined disc with a ₹ glyph.
  // Localized and unmistakable as money; a generic $ reads as foreign here.
  return (
    <View
      style={{
        width: 21,
        height: 21,
        borderRadius: 10.5,
        borderWidth: 1.5,
        borderColor: c,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: font.medium, fontSize: 11, lineHeight: 13, color: c }}>₹</Text>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        tabBarStyle: {
          backgroundColor: color.bg,
          borderTopColor: color.neutral900,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: color.accent300,
        tabBarInactiveTintColor: color.neutral500,
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11, textTransform: 'none' },
        tabBarShowIcon: true,
        tabBarIndicatorStyle: { backgroundColor: color.accent, height: 2, top: 0 },
        tabBarPressColor: 'transparent',
      }}
    >
      <Tab.Screen
        name="Log"
        component={LogScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="log" focused={focused} /> }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="stats" focused={focused} /> }}
      />
      <Tab.Screen
        name="Goal"
        component={GoalScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="goal" focused={focused} /> }}
      />
      <Tab.Screen
        name="Money"
        component={MoneyScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="money" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });
  const store = useAppData();

  // S15/S17. The schedule is re-derived from the store on every change, so
  // this one call covers every path that can invalidate a pending push.
  useNotificationSync(store.data, store.setAnnouncedMilestones);

  // A tap that arrives during a cold launch beats the navigator into
  // existence; hold the destination until onReady rather than dropping it.
  const pendingTap = React.useRef<keyof TabParamList | null>(null);
  const goToTab = React.useCallback((screen: string) => {
    if (screen !== 'Log' && screen !== 'Stats' && screen !== 'Goal' && screen !== 'Money') return;
    if (navigationRef.isReady()) navigationRef.navigate('Tabs', { screen });
    else pendingTap.current = screen;
  }, []);
  useNotificationTaps(goToTab);

  // Session-only: once setup completes, profile != null gates instead. Not
  // persisted on purpose — the only user who sees the welcome twice is one
  // who killed the app mid-setup, and they've read one screen, not four.
  const [welcomed, setWelcomed] = React.useState(false);

  const ready = fontsLoaded && store.loaded;
  React.useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null; // native splash is still covering the window

  return (
    <SafeAreaProvider>
      <AppProvider store={store}>
        <StatusBar style="light" />
        {store.data.profile == null ? (
          <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
            {welcomed ? <SetupScreen /> : <WelcomeScreen onBegin={() => setWelcomed(true)} />}
          </SafeAreaView>
        ) : (
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: color.bg }}>
            <NavigationContainer
              theme={navTheme}
              ref={navigationRef}
              onReady={() => {
                const screen = pendingTap.current;
                pendingTap.current = null;
                if (screen) navigationRef.navigate('Tabs', { screen });
              }}
            >
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Tabs" component={Tabs} />
                <Stack.Screen name="Backfill" component={BackfillScreen} />
                <Stack.Screen name="Nicotine" component={NicotineScreen} />
                <Stack.Screen name="Sos" component={SosScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Health" component={HealthScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaView>
        )}
        {/* Rises over whatever tab the user logged from; a no-op until a
            cigarette holds the budget flat that was about to step down. */}
        <BudgetHoldSheet
          notice={store.data.pendingHoldNotice ?? null}
          onDismiss={store.dismissHoldNotice}
        />
      </AppProvider>
    </SafeAreaProvider>
  );
}

// Sentry.wrap adds the error boundary / profiler, but only once init has run.
// Wrapping without a DSN logs an "App Start Span could not be finished" warning
// on every launch, so stay a plain passthrough until Sentry is actually on.
export default sentryDsn ? Sentry.wrap(App) : App;
