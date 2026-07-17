import { Tabs } from 'expo-router';
import { BarChart3, Boxes, CreditCard, Settings } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { THEME } from '@/lib/theme';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = THEME[isDark ? 'dark' : 'light'];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.foreground,
        tabBarInactiveTintColor: theme.mutedForeground,
        tabBarStyle: {
          borderTopColor: theme.border,
          borderTopWidth: 1,
          backgroundColor: theme.background,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '概览', tabBarAccessibilityLabel: '打开概览页', tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: '订阅', tabBarAccessibilityLabel: '打开订阅页', tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} /> }} />
      <Tabs.Screen name="items" options={{ title: '物品', tabBarAccessibilityLabel: '打开物品页', tabBarIcon: ({ color, size }) => <Boxes color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: '设置', tabBarAccessibilityLabel: '打开设置页', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tabs>
  );
}
