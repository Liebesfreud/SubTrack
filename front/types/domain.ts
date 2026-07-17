export type Currency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY';
export type BillingCycle = 'monthly' | 'yearly' | 'weekly' | 'quarterly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type ItemCondition = 'new' | 'good' | 'used' | 'idle' | 'retired';
export type ThemeMode = 'system' | 'light' | 'dark';

export type Category = {
  id: string;
  name: string;
  color: string;
  module: 'subscription' | 'item';
  createdAt: string;
};

export type Subscription = {
  id: string;
  name: string;
  price: number;
  currency: Currency;
  billingCycle: BillingCycle;
  nextPaymentDate: string;
  categoryId?: string;
  icon?: string;
  description?: string;
  notifyDaysBefore: number;
  autoRenew: boolean;
  status: SubscriptionStatus;
  paymentMethod?: string;
  createdAt: string;
};

export type SubscriptionRenewalLog = {
  id: string;
  subscriptionId: string;
  paidAt: string;
  amount: number;
  currency: Currency;
  nextPaymentDate: string;
  note?: string;
  createdAt: string;
};

export type Item = {
  id: string;
  name: string;
  purchasePrice: number;
  currency: Currency;
  purchaseDate: string;
  categoryId?: string;
  location: string;
  condition: ItemCondition;
  usageCount: number;
  lastUsedAt?: string;
  idleAlertDays: number;
  warrantyUntil?: string;
  serialNumber?: string;
  photoUri?: string;
  note?: string;
  createdAt: string;
};

export type ItemUsageLog = {
  id: string;
  itemId: string;
  usedAt: string;
  note?: string;
  createdAt: string;
};

export type AppSettings = {
  baseCurrency: Currency;
  monthlyBudget: number;
  itemIdleAlertDays: number;
  notificationEnabled: boolean;
  themeMode: ThemeMode;
};

export type Insight = {
  title: string;
  value: string;
  caption: string;
  tone: 'blue' | 'green' | 'amber' | 'rose';
};
