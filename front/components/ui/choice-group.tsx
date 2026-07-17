import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function ChoiceGroup<T extends string>({
  values,
  value,
  labels,
  onChange,
}: {
  values: readonly T[];
  value?: T;
  labels?: Partial<Record<T, string>>;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {values.map((item) => (
        <Button key={item} size="sm" variant={item === value ? 'default' : 'secondary'} onPress={() => onChange(item)}>
          <Text>{labels?.[item] ?? item}</Text>
        </Button>
      ))}
    </View>
  );
}
