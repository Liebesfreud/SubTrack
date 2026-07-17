import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function SectionHeader({ title, action, className }: { title: string; action?: React.ReactNode; className?: string }) {
  return (
    <View className={cn('mb-3 flex-row items-center justify-between', className)}>
      <Text variant="h4">{title}</Text>
      {action}
    </View>
  );
}
