import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { PortalHost } from '@rn-primitives/portal';
import { ThemeProvider } from '@react-navigation/native';
import { NAV_THEME, THEME } from '@/lib/theme';
import { useGeistFont } from '@/hooks/use-geist-font';
import { useAppStore } from '@/store/app-store';

export default function RootLayout() {
  const initialize = useAppStore((state) => state.initialize);
  const ready = useAppStore((state) => state.ready);
  const themeMode = useAppStore((state) => state.settings.themeMode);
  const { colorScheme, setColorScheme } = useColorScheme();
  const [fontsLoaded, fontError] = useGeistFont();

  useEffect(() => {
    initialize().catch((error) => console.error('App init failed', error));
  }, [initialize]);

  useEffect(() => {
    setColorScheme(themeMode);
  }, [setColorScheme, themeMode]);

  if (!ready || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaProvider>
        <View className="bg-background flex-1 items-center justify-center">
          <ActivityIndicator color={THEME.light.primary} size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={NAV_THEME[colorScheme === 'dark' ? 'dark' : 'light']}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
