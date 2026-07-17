import { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ItemRow } from '@/components/item-row';
import { Input } from '@/components/ui/input';
import { ItemForm } from '@/components/entity-form';
import { EmptyState, Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { daysUntil, money } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import type { Item } from '@/types/domain';

export default function ItemsScreen() {
  const items = useAppStore((state) => state.items);
  const usageLogs = useAppStore((state) => state.itemUsageLogs);
  const categories = useAppStore((state) => state.categories.filter((category) => category.module === 'item'));
  const settings = useAppStore((state) => state.settings);
  const addItem = useAppStore((state) => state.addItem);
  const updateItem = useAppStore((state) => state.updateItem);
  const removeItem = useAppStore((state) => state.removeItem);
  const markUsed = useAppStore((state) => state.markUsed);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [onlyIdle, setOnlyIdle] = useState(false);
  const [editing, setEditing] = useState<Item | undefined>();
  const [expandedItemId, setExpandedItemId] = useState<string | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const usageTextMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const log of usageLogs) {
      const logs = map.get(log.itemId) ?? [];
      if (logs.length < 3) logs.push(log.usedAt);
      map.set(log.itemId, logs);
    }
    return new Map(Array.from(map.entries()).map(([itemId, logs]) => [itemId, logs.join('、')]));
  }, [usageLogs]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const reference = item.lastUsedAt || item.purchaseDate;
      const idleDays = Math.abs(Math.min(daysUntil(reference), 0));
      const matchedQuery = !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery) || item.location.toLowerCase().includes(normalizedQuery) || item.note?.toLowerCase().includes(normalizedQuery);
      const matchedCategory = !categoryFilter || item.categoryId === categoryFilter;
      const matchedIdle = !onlyIdle || idleDays >= item.idleAlertDays || item.condition === 'idle';
      return matchedQuery && matchedCategory && matchedIdle;
    });
  }, [categoryFilter, items, onlyIdle, query]);

  const totalValue = useMemo(() => filteredItems.reduce((sum, item) => sum + item.purchasePrice, 0), [filteredItems]);
  const categoryName = useCallback((id?: string) => (id ? categoryMap.get(id) : undefined) ?? '未分类', [categoryMap]);
  const recentUsageText = useCallback((itemId: string) => usageTextMap.get(itemId) ?? '', [usageTextMap]);
  const usageLogsByItem = useMemo(() => {
    const map = new Map<string, typeof usageLogs>();
    for (const log of usageLogs) {
      const logs = map.get(log.itemId) ?? [];
      logs.push(log);
      map.set(log.itemId, logs);
    }
    return map;
  }, [usageLogs]);

  const submitEditing = useCallback(async (input: Omit<Item, 'id' | 'createdAt'>) => {
    if (!editing) return;
    await updateItem({ ...editing, ...input });
    setEditing(undefined);
    setIsFormOpen(false);
  }, [editing, updateItem]);

  const submitCreating = useCallback(async (input: Omit<Item, 'id' | 'createdAt'>) => {
    await addItem(input);
    setIsFormOpen(false);
  }, [addItem]);

  const openCreateForm = useCallback(() => {
    setEditing(undefined);
    setIsFormOpen(true);
  }, []);

  const openEditForm = useCallback((item: Item) => {
    setEditing(item);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setEditing(undefined);
    setIsFormOpen(false);
  }, []);

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItemId((value) => value === itemId ? undefined : itemId);
  }, []);

  const renderItem = useCallback(({ item }: { item: Item }) => (
    <ItemRow
      item={item}
      categoryName={categoryName(item.categoryId)}
      recentUsageText={recentUsageText(item.id)}
      fullLogs={usageLogsByItem.get(item.id) ?? []}
      isExpanded={expandedItemId === item.id}
      onToggleExpanded={toggleExpanded}
      onEdit={openEditForm}
      onMarkUsed={markUsed}
      onRemove={removeItem}
    />
  ), [categoryName, expandedItemId, markUsed, openEditForm, recentUsageText, removeItem, toggleExpanded, usageLogsByItem]);

  const listHeader = useMemo(() => (
    <View>
      <View className="mb-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text variant="h2" className="border-b-0 pb-0">物品管理</Text>
            <Text variant="muted" className="mt-1">筛选结果 {filteredItems.length} 件 · 总投入 {money(totalValue)}</Text>
          </View>
          <Button size="sm" onPress={openCreateForm}><Text>新增</Text></Button>
        </View>
      </View>
      <Card className="mb-4">
        <CardContent className="gap-3">
          <Input placeholder="搜索物品、位置或备注" value={query} onChangeText={setQuery} />
          <View className="flex-row flex-wrap gap-2">
            <Button size="sm" variant={!categoryFilter ? 'default' : 'secondary'} onPress={() => setCategoryFilter(undefined)}><Text>全部</Text></Button>
            {categories.map((category) => (
              <Button key={category.id} size="sm" variant={categoryFilter === category.id ? 'default' : 'secondary'} onPress={() => setCategoryFilter(category.id)}>
                <Text>{category.name}</Text>
              </Button>
            ))}
            <Button size="sm" variant={onlyIdle ? 'default' : 'secondary'} onPress={() => setOnlyIdle((value) => !value)}><Text>只看闲置</Text></Button>
          </View>
        </CardContent>
      </Card>
    </View>
  ), [categories, categoryFilter, filteredItems.length, onlyIdle, openCreateForm, query, totalValue]);

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-28 pt-4"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<EmptyState title="没有匹配的物品" description="调整筛选条件，或点击右上角新增一件需要长期追踪的物品。" />}
      />
      <Sheet
        visible={isFormOpen}
        title={editing ? '编辑物品' : '新增物品'}
        subtitle="记录价格、位置、照片、保修和真实使用成本。"
        onClose={closeForm}
      >
        <ItemForm
          categories={categories}
          defaultIdleDays={settings.itemIdleAlertDays}
          initialValue={editing}
          onCancel={closeForm}
          onSubmit={editing ? submitEditing : submitCreating}
        />
      </Sheet>
    </SafeAreaView>
  );
}
