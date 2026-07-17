import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';

type Tone = 'blue' | 'green' | 'amber' | 'rose';

const badgeVariants = {
  blue: 'default',
  green: 'secondary',
  amber: 'outline',
  rose: 'destructive',
} as const;

const progressVariants = {
  blue: undefined,
  green: undefined,
  amber: undefined,
  rose: 'bg-destructive',
};

export function ProgressBar({ value, tone = 'blue' }: { value: number; tone?: Tone }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <Progress value={clamped} indicatorClassName={progressVariants[tone]} />
  );
}

export function InsightCard({
  title,
  description,
  action,
  tone = 'blue',
  onPress,
}: {
  title: string;
  description: string;
  action: string;
  tone?: Tone;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-3 active:opacity-80" accessibilityRole="button" accessibilityLabel={`${title}，${action}`}>
      <Card>
        <CardContent>
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-2">
              <Text className="font-semibold">{title}</Text>
              <Text variant="muted" className="leading-5">{description}</Text>
              <Badge variant={badgeVariants[tone]} className="self-start"><Text>{action}</Text></Badge>
            </View>
            <Icon as={ChevronRight} className="text-muted-foreground size-5" />
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}
