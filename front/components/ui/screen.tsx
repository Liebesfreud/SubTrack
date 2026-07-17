import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';

export function Screen({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-28 pt-4">
        <View className="mb-5 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text variant="h2" className="border-b-0 pb-0">{title}</Text>
            {subtitle ? <Text variant="muted" className="mt-1">{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
