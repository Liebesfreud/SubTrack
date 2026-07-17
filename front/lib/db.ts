import * as SQLite from 'expo-sqlite';
import type { Category, Item, ItemUsageLog, Subscription, SubscriptionRenewalLog, AppSettings } from '@/types/domain';
import { createId, isISODate, nextBillingDate, todayISO } from '@/lib/utils';

const DB_NAME = 'lifeledger_mobile.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const defaultSettings: AppSettings = {
  baseCurrency: 'CNY',
  monthlyBudget: 500,
  itemIdleAlertDays: 45,
  notificationEnabled: true,
  themeMode: 'system',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

const currencies = new Set(['CNY', 'USD', 'EUR', 'GBP', 'JPY']);
const billingCycles = new Set(['monthly', 'yearly', 'weekly', 'quarterly']);
const subscriptionStatuses = new Set(['active', 'paused', 'cancelled']);
const itemConditions = new Set(['new', 'good', 'used', 'idle', 'retired']);
const themeModes = new Set(['system', 'light', 'dark']);

function validOptionalDate(value: unknown) {
  return value === undefined || value === null || value === '' || (typeof value === 'string' && isISODate(value));
}

function validCategory(value: unknown): value is Category {
  return isRecord(value) && isString(value.id) && isString(value.name) && isString(value.color) && (value.module === 'subscription' || value.module === 'item') && isString(value.createdAt);
}

function validSubscription(value: unknown): value is Subscription {
  return isRecord(value)
    && isString(value.id)
    && isString(value.name)
    && isNonNegativeNumber(value.price)
    && currencies.has(String(value.currency))
    && billingCycles.has(String(value.billingCycle))
    && isString(value.nextPaymentDate)
    && isISODate(value.nextPaymentDate)
    && Number.isInteger(value.notifyDaysBefore)
    && Number(value.notifyDaysBefore) >= 0
    && typeof value.autoRenew === 'boolean'
    && subscriptionStatuses.has(String(value.status ?? 'active'))
    && isString(value.createdAt);
}

function validSubscriptionRenewalLog(value: unknown): value is SubscriptionRenewalLog {
  return isRecord(value) && isString(value.id) && isString(value.subscriptionId) && isString(value.paidAt) && isISODate(value.paidAt) && isNonNegativeNumber(value.amount) && currencies.has(String(value.currency)) && isString(value.nextPaymentDate) && isISODate(value.nextPaymentDate) && isString(value.createdAt);
}

function validItem(value: unknown): value is Item {
  return isRecord(value)
    && isString(value.id)
    && isString(value.name)
    && isNonNegativeNumber(value.purchasePrice)
    && currencies.has(String(value.currency))
    && isString(value.purchaseDate)
    && isISODate(value.purchaseDate)
    && isString(value.location)
    && itemConditions.has(String(value.condition))
    && Number.isInteger(value.usageCount)
    && Number(value.usageCount) >= 0
    && isPositiveInteger(value.idleAlertDays)
    && validOptionalDate(value.lastUsedAt)
    && validOptionalDate(value.warrantyUntil)
    && isString(value.createdAt);
}

function validItemUsageLog(value: unknown): value is ItemUsageLog {
  return isRecord(value) && isString(value.id) && isString(value.itemId) && isString(value.usedAt) && isISODate(value.usedAt) && isString(value.createdAt);
}

function validSettings(value: unknown): value is AppSettings {
  return isRecord(value) && currencies.has(String(value.baseCurrency)) && isNonNegativeNumber(value.monthlyBudget) && isPositiveInteger(value.itemIdleAlertDays) && typeof value.notificationEnabled === 'boolean' && themeModes.has(String(value.themeMode ?? 'system'));
}

function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  return dbPromise;
}

function boolToInt(value: boolean) {
  return value ? 1 : 0;
}

function intToBool(value: number) {
  return value === 1;
}

export async function migrateDatabase() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      module TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      billingCycle TEXT NOT NULL,
      nextPaymentDate TEXT NOT NULL,
      categoryId TEXT,
      icon TEXT,
      description TEXT,
      notifyDaysBefore INTEGER NOT NULL,
      autoRenew INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      paymentMethod TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS subscription_renewal_logs (
      id TEXT PRIMARY KEY NOT NULL,
      subscriptionId TEXT NOT NULL,
      paidAt TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      nextPaymentDate TEXT NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      purchasePrice REAL NOT NULL,
      currency TEXT NOT NULL,
      purchaseDate TEXT NOT NULL,
      categoryId TEXT,
      location TEXT NOT NULL,
      condition TEXT NOT NULL,
      usageCount INTEGER NOT NULL,
      lastUsedAt TEXT,
      idleAlertDays INTEGER NOT NULL,
      warrantyUntil TEXT,
      serialNumber TEXT,
      photoUri TEXT,
      note TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS item_usage_logs (
      id TEXT PRIMARY KEY NOT NULL,
      itemId TEXT NOT NULL,
      usedAt TEXT NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_categories_module ON categories(module);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment ON subscriptions(nextPaymentDate);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subscription_logs_subscription ON subscription_renewal_logs(subscriptionId, paidAt DESC);
    CREATE INDEX IF NOT EXISTS idx_items_purchase_date ON items(purchaseDate DESC);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(categoryId);
    CREATE INDEX IF NOT EXISTS idx_item_usage_logs_item ON item_usage_logs(itemId, usedAt DESC);
  `);
  await ensureColumn(db, 'subscriptions', 'status', "TEXT NOT NULL DEFAULT 'active'");
  await ensureColumn(db, 'subscriptions', 'paymentMethod', 'TEXT');
  await ensureColumn(db, 'items', 'warrantyUntil', 'TEXT');
  await ensureColumn(db, 'items', 'serialNumber', 'TEXT');
  await ensureColumn(db, 'items', 'photoUri', 'TEXT');

  const categoryRows = await db.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if ((categoryRows[0]?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    const seeds: Category[] = [
      { id: createId('cat'), name: '影音娱乐', color: '#8B5CF6', module: 'subscription', createdAt: now },
      { id: createId('cat'), name: '生产力', color: '#2563EB', module: 'subscription', createdAt: now },
      { id: createId('cat'), name: '数码设备', color: '#10B981', module: 'item', createdAt: now },
      { id: createId('cat'), name: '家居生活', color: '#F59E0B', module: 'item', createdAt: now },
    ];
    for (const category of seeds) await upsertCategory(category);
  }

  const settingsRows = await db.getAllAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['app']);
  if (!settingsRows[0]) {
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['app', JSON.stringify(defaultSettings)]);
  }
}

async function ensureColumn(db: SQLite.SQLiteDatabase, table: string, column: string, definition: string) {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!rows.some((row) => row.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function listCategories() {
  const db = await getDb();
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY createdAt ASC');
}

export async function upsertCategory(category: Category) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO categories (id, name, color, module, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [category.id, category.name, category.color, category.module, category.createdAt],
  );
}

export async function deleteCategory(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE subscriptions SET categoryId = NULL WHERE categoryId = ?', [id]);
  await db.runAsync('UPDATE items SET categoryId = NULL WHERE categoryId = ?', [id]);
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function listSubscriptions() {
  const db = await getDb();
  const rows = await db.getAllAsync<Omit<Subscription, 'autoRenew'> & { autoRenew: number }>('SELECT * FROM subscriptions ORDER BY nextPaymentDate ASC');
  return rows.map((row) => ({ ...row, autoRenew: intToBool(Number(row.autoRenew)), status: row.status ?? 'active' }));
}

export async function saveSubscription(subscription: Subscription) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO subscriptions (id, name, price, currency, billingCycle, nextPaymentDate, categoryId, icon, description, notifyDaysBefore, autoRenew, status, paymentMethod, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      subscription.id,
      subscription.name,
      subscription.price,
      subscription.currency,
      subscription.billingCycle,
      subscription.nextPaymentDate,
      subscription.categoryId ?? null,
      subscription.icon ?? null,
      subscription.description ?? null,
      subscription.notifyDaysBefore,
      boolToInt(subscription.autoRenew),
      subscription.status ?? 'active',
      subscription.paymentMethod ?? null,
      subscription.createdAt,
    ],
  );
}

export async function deleteSubscription(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM subscription_renewal_logs WHERE subscriptionId = ?', [id]);
  await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]);
}

export async function listSubscriptionRenewalLogs() {
  const db = await getDb();
  return db.getAllAsync<SubscriptionRenewalLog>('SELECT * FROM subscription_renewal_logs ORDER BY paidAt DESC, createdAt DESC');
}

export async function saveSubscriptionRenewalLog(log: SubscriptionRenewalLog) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO subscription_renewal_logs (id, subscriptionId, paidAt, amount, currency, nextPaymentDate, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [log.id, log.subscriptionId, log.paidAt, log.amount, log.currency, log.nextPaymentDate, log.note ?? null, log.createdAt],
  );
}

export async function renewSubscription(subscription: Subscription) {
  const nextPaymentDate = nextBillingDate(subscription.nextPaymentDate, subscription.billingCycle);
  await saveSubscription({ ...subscription, nextPaymentDate, status: 'active' });
  await saveSubscriptionRenewalLog({
    id: createId('renewal'),
    subscriptionId: subscription.id,
    paidAt: todayISO(),
    amount: subscription.price,
    currency: subscription.currency,
    nextPaymentDate,
    createdAt: new Date().toISOString(),
  });
}

export async function listItems() {
  const db = await getDb();
  return db.getAllAsync<Item>('SELECT * FROM items ORDER BY purchaseDate DESC');
}

export async function saveItem(item: Item) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO items (id, name, purchasePrice, currency, purchaseDate, categoryId, location, condition, usageCount, lastUsedAt, idleAlertDays, warrantyUntil, serialNumber, photoUri, note, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.name,
      item.purchasePrice,
      item.currency,
      item.purchaseDate,
      item.categoryId ?? null,
      item.location,
      item.condition,
      item.usageCount,
      item.lastUsedAt ?? null,
      item.idleAlertDays,
      item.warrantyUntil ?? null,
      item.serialNumber ?? null,
      item.photoUri ?? null,
      item.note ?? null,
      item.createdAt,
    ],
  );
}

export async function deleteItem(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM item_usage_logs WHERE itemId = ?', [id]);
  await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

export async function markItemUsed(item: Item) {
  const usedAt = todayISO();
  await saveItem({ ...item, usageCount: item.usageCount + 1, lastUsedAt: usedAt, condition: item.condition === 'idle' ? 'used' : item.condition });
  await saveItemUsageLog({ id: createId('usage'), itemId: item.id, usedAt, createdAt: new Date().toISOString() });
}

export async function listItemUsageLogs() {
  const db = await getDb();
  return db.getAllAsync<ItemUsageLog>('SELECT * FROM item_usage_logs ORDER BY usedAt DESC, createdAt DESC');
}

export async function saveItemUsageLog(log: ItemUsageLog) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO item_usage_logs (id, itemId, usedAt, note, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [log.id, log.itemId, log.usedAt, log.note ?? null, log.createdAt],
  );
}

export async function getSettings() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['app']);
  if (!rows[0]?.value) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(rows[0].value) } as AppSettings;
  } catch {
    await saveSettings(defaultSettings);
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['app', JSON.stringify(settings)]);
}

export async function exportSnapshot() {
  const [categories, subscriptions, subscriptionRenewalLogs, items, itemUsageLogs, settings] = await Promise.all([listCategories(), listSubscriptions(), listSubscriptionRenewalLogs(), listItems(), listItemUsageLogs(), getSettings()]);
  return { version: 3, exportedAt: new Date().toISOString(), categories, subscriptions, subscriptionRenewalLogs, items, itemUsageLogs, settings };
}

export async function importSnapshot(payload: { categories?: Category[]; subscriptions?: Subscription[]; subscriptionRenewalLogs?: SubscriptionRenewalLog[]; items?: Item[]; itemUsageLogs?: ItemUsageLog[]; settings?: AppSettings }) {
  if (!isRecord(payload)) throw new Error('Invalid snapshot');
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    if (Array.isArray(payload.categories)) for (const category of payload.categories.filter(validCategory)) await upsertCategory(category);
    if (Array.isArray(payload.subscriptions)) for (const subscription of payload.subscriptions.filter(validSubscription)) await saveSubscription({ ...subscription, status: subscription.status ?? 'active' });
    if (Array.isArray(payload.subscriptionRenewalLogs)) for (const log of payload.subscriptionRenewalLogs.filter(validSubscriptionRenewalLog)) await saveSubscriptionRenewalLog(log);
    if (Array.isArray(payload.items)) for (const item of payload.items.filter(validItem)) await saveItem(item);
    if (Array.isArray(payload.itemUsageLogs)) for (const log of payload.itemUsageLogs.filter(validItemUsageLog)) await saveItemUsageLog(log);
    if (validSettings(payload.settings)) await saveSettings({ ...defaultSettings, ...payload.settings });
  });
}
