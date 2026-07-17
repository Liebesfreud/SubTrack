import { ScrollView, View } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/text';

export function Sheet({
  visible,
  title,
  subtitle,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88%] p-0">
        <DialogHeader className="px-6 pb-2 pt-6 text-left">
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <DialogDescription className="leading-5">{subtitle}</DialogDescription> : null}
        </DialogHeader>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-6 pb-6">
            {children}
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}

export function EmptyState({ title, description, className }: { title: string; description: string; className?: string }) {
  return (
    <View className={cn('border-border bg-card items-center rounded-lg border border-dashed p-6', className)}>
      <Text variant="h4">{title}</Text>
      <Text variant="muted" className="mt-2 text-center leading-5">{description}</Text>
    </View>
  );
}
