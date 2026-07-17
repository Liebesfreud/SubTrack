import { Label as RnrLabel } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function AppText({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-foreground text-base', className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<typeof RnrLabel>) {
  return <RnrLabel className={className} {...props} />;
}

export function Title({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text variant="h4" className={className} {...props} />;
}
