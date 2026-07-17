import { create } from 'zustand';
import type { AppSettings, Category, Item, ItemUsageLog, Subscription, SubscriptionRenewalLog } from '@/types/domain';
import { annualCost, createId, daysUntil, monthlyCost } from '@/lib/utils';
import * as repo from '@/lib/db';
import { syncLocalReminders } from '@/lib/notifications';

type AppState = {
  ready: boolean;
  categories: Category[];
  subscriptions: Subscription[];
  subscriptionRenewalLogs: SubscriptionRenewalLog[];
  items: Item[];
  itemUsageLogs: ItemUsageLog[];
  settings: AppSettings;
  initialize: () => Promise<void>;
  addSubscription: (input: Omit<Subscription, 'id' | 'createdAt'>) => Promise<void>;
  updateSubscription: (subscription: Subscription) => Promise<void>;
  renewSubscription: (subscription: Subscription) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
  addItem: (input: Omit<Item, 'id' | 'createdAt' | 'usageCount'> & { usageCount?: number }) => Promise<void>;
  updateItem: (item: Item) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  markUsed: (item: Item) => Promise<void>;
  addCategory: (input: Pick<Category, 'name' | 'color' | 'module'>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
};

const initialSettings: AppSettings = {
  baseCurrency: 'CNY',
  monthlyBudget: 500,
  itemIdleAlertDays: 45,
  notificationEnabled: true,
  themeMode: 'system',
};

async function refresh(set: (state: Partial<AppState>) => void) {
  const [categories, subscriptions, subscriptionRenewalLogs, items, itemUsageLogs, settings] = await Promise.all([
    repo.listCategories(),
    repo.listSubscriptions(),
    repo.listSubscriptionRenewalLogs(),
    repo.listItems(),
    repo.listItemUsageLogs(),
    repo.getSettings(),
  ]);
  set({ categories, subscriptions, subscriptionRenewalLogs, items, itemUsageLogs, settings, ready: true });
  await syncLocalReminders(subscriptions, items, settings).catch((error) => console.warn('Reminder sync skipped', error));
}

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  categories: [],
  subscriptions: [],
  subscriptionRenewalLogs: [],
  items: [],
  itemUsageLogs: [],
  settings: initialSettings,
  initialize: async () => {
    await repo.migrateDatabase();
    await refresh(set);
  },
  addSubscription: async (input) => {
    await repo.saveSubscription({ ...input, id: createId('sub'), status: input.status ?? 'active', createdAt: new Date().toISOString() });
    await refresh(set);
  },
  updateSubscription: async (subscription) => {
    await repo.saveSubscription(subscription);
    await refresh(set);
  },
  renewSubscription: async (subscription) => {
    await repo.renewSubscription(subscription);
    await refresh(set);
  },
  removeSubscription: async (id) => {
    await repo.deleteSubscription(id);
    await refresh(set);
  },
  addItem: async (input) => {
    await repo.saveItem({ ...input, id: createId('item'), usageCount: input.usageCount ?? 0, createdAt: new Date().toISOString() });
    await refresh(set);
  },
  updateItem: async (item) => {
    await repo.saveItem(item);
    await refresh(set);
  },
  removeItem: async (id) => {
    await repo.deleteItem(id);
    await refresh(set);
  },
  markUsed: async (item) => {
    await repo.markItemUsed(item);
    await refresh(set);
  },
  addCategory: async (input) => {
    await repo.upsertCategory({ ...input, id: createId('cat'), createdAt: new Date().toISOString() });
    await refresh(set);
  },
  removeCategory: async (id) => {
    await repo.deleteCategory(id);
    await refresh(set);
  },
  updateSettings: async (settings) => {
    await repo.saveSettings(settings);
    await refresh(set);
  },
}));

export function selectDashboardData(state: AppState) {
  const activeSubscriptions = state.subscriptions.filter((sub) => sub.status === 'active');
  const monthlySpend = activeSubscriptions.reduce((sum, sub) => sum + monthlyCost(sub.price, sub.billingCycle), 0);
  const annualSpend = activeSubscriptions.reduce((sum, sub) => sum + annualCost(sub.price, sub.billingCycle), 0);
  const dueSoon = activeSubscriptions.filter((sub) => daysUntil(sub.nextPaymentDate) <= sub.notifyDaysBefore).length;
  const idleItems = state.items.filter((item) => {
    const reference = item.lastUsedAt || item.purchaseDate;
    return daysUntil(reference) < -item.idleAlertDays;
  }).length;
  const itemValue = state.items.reduce((sum, item) => sum + item.purchasePrice, 0);
  const usedThisMonth = state.itemUsageLogs.filter((log) => log.usedAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;
  const longTermScore = Math.max(1, Math.min(99, Math.round(100 - monthlySpend / Math.max(state.settings.monthlyBudget, 1) * 35 - idleItems * 8 + Math.min(usedThisMonth, 12) * 2)));

  return { monthlySpend, annualSpend, dueSoon, idleItems, itemValue, usedThisMonth, longTermScore };
}
