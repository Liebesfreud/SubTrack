import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Card, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/metric-card';
import { InsightCard, ProgressBar } from '@/components/insight-card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { annualCost, daysUntil, money, monthlyCost } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

export default function DashboardScreen() {
  const subscriptions = useAppStore((state) => state.subscriptions);
  const items = useAppStore((state) => state.items);
  const itemUsageLogs = useAppStore((state) => state.itemUsageLogs);
  const settings = useAppStore((state) => state.settings);

  const data = useMemo(() => {
    const activeSubscriptions = subscriptions.filter((sub) => sub.status === 'active');
    const monthlySpend = activeSubscriptions.reduce((sum, sub) => sum + monthlyCost(sub.price, sub.billingCycle), 0);
    const annualSpend = activeSubscriptions.reduce((sum, sub) => sum + annualCost(sub.price, sub.billingCycle), 0);
    const dueSoon = activeSubscriptions.filter((sub) => daysUntil(sub.nextPaymentDate) <= sub.notifyDaysBefore).length;
    const idleItemCount = items.filter((item) => daysUntil(item.lastUsedAt || item.purchaseDate) < -item.idleAlertDays).length;
    const itemValue = items.reduce((sum, item) => sum + item.purchasePrice, 0);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usedThisMonth = itemUsageLogs.filter((log) => log.usedAt.slice(0, 7) === currentMonth).length;
    const longTermScore = Math.max(1, Math.min(99, Math.round(100 - monthlySpend / Math.max(settings.monthlyBudget, 1) * 35 - idleItemCount * 8 + Math.min(usedThisMonth, 12) * 2)));
    return { monthlySpend, annualSpend, dueSoon, idleItems: idleItemCount, itemValue, usedThisMonth, longTermScore };
  }, [itemUsageLogs, items, settings.monthlyBudget, subscriptions]);

  const budgetUsage = settings.monthlyBudget > 0 ? data.monthlySpend / settings.monthlyBudget * 100 : 0;

  const dueSubscriptions = useMemo(() => subscriptions
    .filter((sub) => sub.status === 'active')
    .sort((left, right) => daysUntil(left.nextPaymentDate) - daysUntil(right.nextPaymentDate))
    .slice(0, 3), [subscriptions]);

  const idleItems = useMemo(() => items
    .map((item) => ({ item, idleDays: Math.abs(Math.min(daysUntil(item.lastUsedAt || item.purchaseDate), 0)) }))
    .sort((left, right) => right.idleDays - left.idleDays)
    .slice(0, 3), [items]);

  const recentUsageLogs = useMemo(() => itemUsageLogs.slice(0, 4), [itemUsageLogs]);
  const itemNameMap = useMemo(() => new Map(items.map((item) => [item.id, item.name])), [items]);
  const itemName = (id: string) => itemNameMap.get(id) ?? '未知物品';

  const insights = useMemo(() => {
    const result: { title: string; description: string; action: string; tone: 'blue' | 'green' | 'amber' | 'rose'; route: '/subscriptions' | '/items' | '/settings' }[] = [];
    if (budgetUsage >= 100) {
      result.push({ title: '订阅预算已超额', description: `当前月化订阅约 ${money(data.monthlySpend)}，已经超过预算 ${money(settings.monthlyBudget)}。`, action: '检查订阅', tone: 'rose', route: '/subscriptions' });
    } else if (budgetUsage >= 80) {
      result.push({ title: '订阅预算接近上限', description: `预算使用率 ${Math.round(budgetUsage)}%，建议确认近期是否有可暂停服务。`, action: '查看订阅', tone: 'amber', route: '/subscriptions' });
    }
    if (data.dueSoon > 0) {
      result.push({ title: '有订阅即将续费', description: `${data.dueSoon} 项订阅已进入提醒窗口，适合续费前再确认一次价值。`, action: '处理续费', tone: 'blue', route: '/subscriptions' });
    }
    if (data.idleItems > 0) {
      result.push({ title: '发现闲置物品', description: `${data.idleItems} 件物品超过闲置提醒天数，考虑使用、转赠或出售。`, action: '查看物品', tone: 'rose', route: '/items' });
    }
    if (result.length === 0) {
      result.push({ title: '状态健康', description: '订阅支出和物品使用都处在较稳定状态，继续记录真实使用。', action: '继续记录', tone: 'green', route: '/items' });
    }
    return result.slice(0, 3);
  }, [budgetUsage, data.dueSoon, data.idleItems, data.monthlySpend, settings.monthlyBudget]);

  return (
    <Screen title="长期生活仪表盘" subtitle="订阅支出、资产使用和长期主义指数一屏掌握">
      <Card className="mb-4">
        <CardContent className="gap-4">
          <Text variant="muted">Long-term Score</Text>
          <View className="flex-row items-end justify-between gap-4">
            <Text variant="h1" className="text-left">{data.longTermScore}</Text>
            <Text variant="muted" className="flex-1 text-right leading-5">预算克制、少闲置、多记录，分数越高</Text>
          </View>
          <View className="bg-muted gap-3 rounded-lg p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-medium">订阅预算使用率</Text>
              <Text className="font-semibold">{Math.round(budgetUsage)}%</Text>
            </View>
          <ProgressBar value={budgetUsage} tone={budgetUsage >= 100 ? 'rose' : budgetUsage >= 80 ? 'amber' : 'green'} />
            <Text variant="muted">{money(data.monthlySpend)} / {money(settings.monthlyBudget)}</Text>
          </View>
        </CardContent>
      </Card>

      <View className="mb-4 flex-row flex-wrap gap-3">
        <MetricCard title="本月订阅" value={money(data.monthlySpend)} caption={`预算 ${money(settings.monthlyBudget)}`} tone={budgetUsage >= 100 ? 'rose' : 'blue'} />
        <MetricCard title="年度支出" value={money(data.annualSpend)} caption={`${subscriptions.length} 项订阅`} tone="amber" />
        <MetricCard title="物品总值" value={money(data.itemValue)} caption={`${items.length} 件物品`} tone="green" />
        <MetricCard title="本月使用" value={`${data.usedThisMonth}`} caption="记录的真实使用" tone="green" />
        <MetricCard title="需关注" value={`${data.dueSoon + data.idleItems}`} caption="续费/闲置提醒" tone="rose" />
      </View>

      <View className="mb-1">
        <Text variant="h4" className="mb-3">今日洞察</Text>
        {insights.map((insight) => (
          <InsightCard
            key={insight.title}
            title={insight.title}
            description={insight.description}
            action={insight.action}
            tone={insight.tone}
            onPress={() => router.push(insight.route)}
          />
        ))}
      </View>

      <Pressable onPress={() => router.push('/subscriptions')} className="active:opacity-80" accessibilityRole="button" accessibilityLabel="查看全部即将处理的订阅">
        <Card className="mb-4">
          <CardContent className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text variant="h4">即将处理的订阅</Text>
              <Text variant="small">查看全部</Text>
            </View>
            {dueSubscriptions.length === 0 ? (
              <Text variant="muted">还没有订阅，去添加第一个长期支出。</Text>
            ) : dueSubscriptions.map((sub) => (
              <View key={sub.id} className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-medium">{sub.icon || '💳'} {sub.name}</Text>
                  <Text variant="muted">{daysUntil(sub.nextPaymentDate)} 天后 · {sub.nextPaymentDate}</Text>
                </View>
                <Text className="font-semibold">{money(sub.price, sub.currency)}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push('/items')} className="active:opacity-80" accessibilityRole="button" accessibilityLabel="查看全部闲置资产">
        <Card className="mb-4">
          <CardContent className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text variant="h4">闲置资产雷达</Text>
              <Text variant="small">查看全部</Text>
            </View>
            {idleItems.length === 0 ? (
              <Text variant="muted">目前没有明显闲置物品，继续保持。</Text>
            ) : idleItems.map(({ item, idleDays }) => (
              <View key={item.id} className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-medium">{item.name}</Text>
                  <Text variant="muted">{item.location} · 闲置 {idleDays} 天 · 已使用 {item.usageCount} 次</Text>
                </View>
                <Text className="font-semibold">{money(item.purchasePrice, item.currency)}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push('/items')} className="active:opacity-80" accessibilityRole="button" accessibilityLabel="前往物品页记录使用">
        <Card>
          <CardContent className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text variant="h4">最近使用记录</Text>
              <Text variant="small">去记录</Text>
            </View>
            {recentUsageLogs.length === 0 ? (
              <Text variant="muted">还没有使用记录，去物品页点一次“记录使用”。</Text>
            ) : recentUsageLogs.map((log) => (
              <View key={log.id} className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-medium">{itemName(log.itemId)}</Text>
                  <Text variant="muted">使用日期 {log.usedAt}</Text>
                </View>
                <Text className="font-semibold">+1</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      </Pressable>
    </Screen>
  );
}
