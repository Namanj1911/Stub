import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts,
} from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GoalScreen } from './src/screens/GoalScreen';
import { LogScreen } from './src/screens/LogScreen';
import { MoneyScreen } from './src/screens/MoneyScreen';
import { SosScreen } from './src/screens/SosScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { useAppData } from './src/store';
import { color, font } from './src/theme';

type Tab = 'log' | 'stats' | 'goal' | 'money' | 'sos';

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium });
  const {
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
  } = useAppData();
  const [tab, setTab] = useState<Tab>('log');

  if (!fontsLoaded || !loaded) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
        <StatusBar style="light" />
      {data.profile == null ? (
        <SetupScreen onDone={completeSetup} />
      ) : (
        <View style={{ flex: 1 }}>
          {tab === 'log' ? (
            <LogScreen
              profile={data.profile}
              entries={data.entries}
              addEntry={addEntry}
              undoLast={undoLast}
              editEntry={editEntry}
              removeEntry={removeEntry}
            />
          ) : tab === 'stats' ? (
            <StatsScreen profile={data.profile} entries={data.entries} setBrandId={setBrandId} />
          ) : tab === 'goal' ? (
            <GoalScreen profile={data.profile} entries={data.entries} setPace={setPace} />
          ) : tab === 'money' ? (
            <MoneyScreen
              profile={data.profile}
              entries={data.entries}
              setPricePerStick={setPricePerStick}
            />
          ) : (
            <SosScreen
              cravings={data.cravings}
              addCraving={addCraving}
              logSmoked={() => addEntry(6)}
            />
          )}
          <TabBar tab={tab} setTab={setTab} />
        </View>
      )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: color.neutral900,
        backgroundColor: color.bg,
      }}
    >
      {(['log', 'stats', 'goal', 'money', 'sos'] as const).map((t) => (
        <Pressable
          key={t}
          onPress={() => setTab(t)}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}
        >
          <Text
            style={{
              fontFamily: font.medium,
              fontSize: 13,
              color: tab === t ? color.accent300 : color.neutral600,
            }}
          >
            {t}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
