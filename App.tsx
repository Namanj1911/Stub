import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider } from './src/AppContext';
import { RootStackParamList, TabParamList } from './src/navigation';
import { BackfillScreen } from './src/screens/BackfillScreen';
import { GoalScreen } from './src/screens/GoalScreen';
import { LogScreen } from './src/screens/LogScreen';
import { MoneyScreen } from './src/screens/MoneyScreen';
import { NicotineScreen } from './src/screens/NicotineScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { SosScreen } from './src/screens/SosScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { useAppData } from './src/store';
import { color, font } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

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

// Tab icons per the 1a mockup: 20px geometric marks, 1.5px border —
// square (Log), circle (Stats), diamond (Goal); Money extends the family
// with a coin (circle + center dot).
function TabIcon({ shape, focused }: { shape: 'square' | 'circle' | 'diamond' | 'coin'; focused: boolean }) {
  const stroke = focused ? color.accent : color.neutral700;
  const base = {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: stroke,
  } as const;
  if (shape === 'square') return <View style={{ ...base, borderRadius: 6 }} />;
  if (shape === 'circle') return <View style={{ ...base, borderRadius: 10 }} />;
  if (shape === 'diamond') {
    return <View style={{ ...base, borderRadius: 6, transform: [{ rotate: '45deg' }, { scale: 0.85 }] }} />;
  }
  return (
    <View style={{ ...base, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stroke }} />
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: color.bg,
          borderTopColor: color.neutral900,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: color.accent300,
        tabBarInactiveTintColor: color.neutral500,
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="Log"
        component={LogScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon shape="square" focused={focused} /> }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon shape="circle" focused={focused} /> }}
      />
      <Tab.Screen
        name="Goal"
        component={GoalScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon shape="diamond" focused={focused} /> }}
      />
      <Tab.Screen
        name="Money"
        component={MoneyScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon shape="coin" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium });
  const store = useAppData();

  if (!fontsLoaded || !store.loaded) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <AppProvider store={store}>
        <StatusBar style="light" />
        {store.data.profile == null ? (
          <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
            <SetupScreen />
          </SafeAreaView>
        ) : (
          <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.bg }}>
            <NavigationContainer theme={navTheme}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Tabs" component={Tabs} />
                <Stack.Screen name="Backfill" component={BackfillScreen} />
                <Stack.Screen name="Nicotine" component={NicotineScreen} />
                <Stack.Screen name="Sos" component={SosScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaView>
        )}
      </AppProvider>
    </SafeAreaProvider>
  );
}
