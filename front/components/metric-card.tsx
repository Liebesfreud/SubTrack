import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

const variants = {
  blue: 'default',
  green: 'secondary',
  amber: 'outline',
  rose: 'destructive',
} as const;

const tones = {
  blue: true,
  green: true,
  amber: true,
  rose: true,
};

export function MetricCard({ title, value, caption, tone = 'blue' }: { title: string; value: string; caption: string; tone?: keyof typeof tones }) {
  return (
    <Card className="flex-1 min-w-[46%]">
      <CardContent className="gap-3">
        <Text variant="muted">{title}</Text>
        <Text variant="h3">{value}</Text>
        <Badge variant={variants[tone]} className="self-start"><Text>{caption}</Text></Badge>
      </CardContent>
    </Card>
  );
}
