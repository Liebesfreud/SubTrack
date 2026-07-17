import { memo } from 'react';
import { Image, View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { confirmAction } from '@/lib/confirm-action';
import { daysUntil, money } from '@/lib/utils';
import type { Item, ItemUsageLog } from '@/types/domain';

function ItemRowComponent({
  item,
  categoryName,
  recentUsageText,
  fullLogs,
  isExpanded,
  onToggleExpanded,
  onEdit,
  onMarkUsed,
  onRemove,
}: {
  item: Item;
  categoryName: string;
  recentUsageText: string;
  fullLogs: ItemUsageLog[];
  isExpanded: boolean;
  onToggleExpanded: (itemId: string) => void;
  onEdit: (item: Item) => void;
  onMarkUsed: (item: Item) => void;
  onRemove: (itemId: string) => void;
}) {
  const reference = item.lastUsedAt || item.purchaseDate;
  const idleDays = Math.abs(Math.min(daysUntil(reference), 0));
  const costPerUse = item.usageCount > 0 ? item.purchasePrice / item.usageCount : item.purchasePrice;

  return (
    <Card className="mb-3">
      <CardContent className="gap-4">
        {item.photoUri ? <Image source={{ uri: item.photoUri }} className="bg-muted h-40 w-full rounded-lg" resizeMode="cover" /> : null}
        <View className="flex-row justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text variant="h4">{item.name}</Text>
            <Text variant="muted">{categoryName} · {item.location} · {item.condition} · 使用 {item.usageCount} 次</Text>
          </View>
          <View className="items-end gap-2">
            <Text className="font-semibold">{money(item.purchasePrice, item.currency)}</Text>
            <Badge variant={idleDays >= item.idleAlertDays ? 'destructive' : 'secondary'}>
              <Text>闲置 {idleDays} 天</Text>
            </Badge>
          </View>
        </View>
        <Text variant="muted">单次使用成本约 {money(costPerUse, item.currency)} · 上次使用 {item.lastUsedAt || '未记录'}</Text>
        <Text variant="muted">保修截止：{item.warrantyUntil || '未记录'} · 序列号：{item.serialNumber || '未记录'}</Text>
        {recentUsageText ? <Text variant="muted">最近使用：{recentUsageText}</Text> : null}
        {item.note ? <Text variant="muted">备注：{item.note}</Text> : null}
        {isExpanded ? (
          <View className="bg-muted gap-2 rounded-lg p-3">
            <Text className="font-semibold">完整使用历史</Text>
            {fullLogs.length === 0 ? (
              <Text variant="muted">暂无使用记录。</Text>
            ) : fullLogs.map((log) => (
              <View key={log.id} className="flex-row justify-between">
                <Text className="text-sm">{log.usedAt}</Text>
                <Text className="text-sm">+1 次</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" variant="secondary" onPress={() => onMarkUsed(item)}><Text>记录使用</Text></Button>
          <Button size="sm" variant="secondary" onPress={() => onToggleExpanded(item.id)}><Text>{isExpanded ? '收起' : '详情'}</Text></Button>
          <Button size="sm" variant="secondary" onPress={() => onEdit(item)}><Text>编辑</Text></Button>
          <Button
            size="sm"
            variant="destructive"
            onPress={() => confirmAction('删除物品', `确定删除 ${item.name}？`, () => onRemove(item.id))}
          >
            <Text>删除</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

export const ItemRow = memo(ItemRowComponent);
