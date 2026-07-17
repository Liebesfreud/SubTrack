import { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { SubscriptionForm } from '@/components/entity-form';
import { confirmAction } from '@/lib/confirm-action';
import { cycleLabel, daysUntil, money, monthlyCost } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import type { Subscription } from '@/types/domain';

const statusLabel = {
  active: '使用中',
  paused: '已暂停',
  cancelled: '已取消',
};

export default function SubscriptionsScreen() {
  const subscriptions = useAppStore((state) => state.subscriptions);
  const categories = useAppStore((state) => state.categories.filter((category) => category.module === 'subscription'));
  const addSubscription = useAppStore((state) => state.addSubscription);
  const updateSubscription = useAppStore((state) => state.updateSubscription);
  const renewSubscription = useAppStore((state) => state.renewSubscription);
  const removeSubscription = useAppStore((state) => state.removeSubscription);
  const renewalLogs = useAppStore((state) => state.subscriptionRenewalLogs);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [editing, setEditing] = useState<Subscription | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const renewalMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const log of renewalLogs) {
      const logs = map.get(log.subscriptionId) ?? [];
      if (logs.length < 2) logs.push(log.paidAt);
      map.set(log.subscriptionId, logs);
    }
    return map;
  }, [renewalLogs]);

  const filteredSubscriptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return subscriptions.filter((subscription) => {
      const matchedQuery = !normalizedQuery || subscription.name.toLowerCase().includes(normalizedQuery) || subscription.description?.toLowerCase().includes(normalizedQuery);
      const matchedCategory = !categoryFilter || subscription.categoryId === categoryFilter;
      return matchedQuery && matchedCategory;
    });
  }, [categoryFilter, query, subscriptions]);

  const totalMonthly = useMemo(() => filteredSubscriptions.reduce((sum, sub) => sum + monthlyCost(sub.price, sub.billingCycle), 0), [filteredSubscriptions]);
  const categoryName = useCallback((id?: string) => (id ? categoryMap.get(id) : undefined) ?? '未分类', [categoryMap]);

  const submitEditing = useCallback(async (input: Omit<Subscription, 'id' | 'createdAt'>) => {
    if (!editing) return;
    await updateSubscription({ ...editing, ...input });
    setEditing(undefined);
    setIsFormOpen(false);
  }, [editing, updateSubscription]);

  const submitCreating = useCallback(async (input: Omit<Subscription, 'id' | 'createdAt'>) => {
    await addSubscription(input);
    setIsFormOpen(false);
  }, [addSubscription]);

  const openCreateForm = useCallback(() => {
    setEditing(undefined);
    setIsFormOpen(true);
  }, []);

  const openEditForm = useCallback((subscription: Subscription) => {
    setEditing(subscription);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setEditing(undefined);
    setIsFormOpen(false);
  }, []);

  const renderSubscription = useCallback(({ item: sub }: { item: Subscription }) => {
    const days = daysUntil(sub.nextPaymentDate);
    const recentRenewals = renewalMap.get(sub.id)?.join('、');
    return (
      <Card className="mb-3">
        <CardContent className="gap-4">
          <View className="flex-row justify-between gap-4">
            <View className="flex-1 gap-1">
              <Text variant="h4">{sub.icon || '💳'} {sub.name}</Text>
              <Text variant="muted">{cycleLabel[sub.billingCycle]} · {categoryName(sub.categoryId)} · 下次付款 {sub.nextPaymentDate}</Text>
            </View>
            <View className="items-end gap-2">
              <Text className="font-semibold">{money(sub.price, sub.currency)}</Text>
              <Badge variant={sub.status !== 'active' ? 'secondary' : days <= sub.notifyDaysBefore ? 'destructive' : 'outline'}>
                <Text>{sub.status !== 'active' ? statusLabel[sub.status] : days < 0 ? `已过期 ${Math.abs(days)} 天` : `${days} 天后`}</Text>
              </Badge>
            </View>
          </View>
          <Text variant="muted">折算月支出 {money(monthlyCost(sub.price, sub.billingCycle), sub.currency)} · {sub.autoRenew ? '自动续费' : '手动确认'} · 提前 {sub.notifyDaysBefore} 天提醒</Text>
          <Text variant="muted">付款方式：{sub.paymentMethod || '未记录'}{recentRenewals ? ` · 最近续费 ${recentRenewals}` : ''}</Text>
          <View className="flex-row flex-wrap gap-2">
            <Button size="sm" variant="default" onPress={() => renewSubscription(sub)}><Text>已续费</Text></Button>
            <Button size="sm" variant="secondary" onPress={() => openEditForm(sub)}><Text>编辑</Text></Button>
            <Button
              size="sm"
              variant="destructive"
              onPress={() => confirmAction('删除订阅', `确定删除 ${sub.name}？`, () => removeSubscription(sub.id))}
            >
              <Text>删除</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    );
  }, [categoryName, openEditForm, removeSubscription, renewalMap, renewSubscription]);

  const listHeader = useMemo(() => (
    <View>
      <View className="mb-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text variant="h2" className="border-b-0 pb-0">订阅管理</Text>
            <Text variant="muted" className="mt-1">筛选结果 {filteredSubscriptions.length} 项 · 月支出 {money(totalMonthly)}</Text>
          </View>
          <Button size="sm" onPress={openCreateForm}><Text>新增</Text></Button>
        </View>
      </View>
      <Card className="mb-4">
        <CardContent className="gap-3">
          <Input placeholder="搜索订阅名称或备注" value={query} onChangeText={setQuery} />
          <View className="flex-row flex-wrap gap-2">
            <Button size="sm" variant={!categoryFilter ? 'default' : 'secondary'} onPress={() => setCategoryFilter(undefined)}><Text>全部</Text></Button>
            {categories.map((category) => (
              <Button key={category.id} size="sm" variant={categoryFilter === category.id ? 'default' : 'secondary'} onPress={() => setCategoryFilter(category.id)}>
                <Text>{category.name}</Text>
              </Button>
            ))}
          </View>
        </CardContent>
      </Card>
    </View>
  ), [categories, categoryFilter, filteredSubscriptions.length, openCreateForm, query, totalMonthly]);

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(item) => item.id}
        renderItem={renderSubscription}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-28 pt-4"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<EmptyState title="没有匹配的订阅" description="调整筛选条件，或点击右上角新增第一个长期扣款。" />}
      />
      <Sheet
        visible={isFormOpen}
        title={editing ? '编辑订阅' : '新增订阅'}
        subtitle="记录支出周期、付款方式和续费提醒。"
        onClose={closeForm}
      >
        <SubscriptionForm
          categories={categories}
          initialValue={editing}
          onCancel={closeForm}
          onSubmit={editing ? submitEditing : submitCreating}
        />
      </Sheet>
    </SafeAreaView>
  );
}
