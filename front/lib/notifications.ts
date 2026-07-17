import * as Notifications from 'expo-notifications';
import { subDays, parseISO, isAfter, addDays } from 'date-fns';
import { Platform } from 'react-native';
import type { AppSettings, Item, Subscription } from '@/types/domain';
import { money } from '@/lib/utils';

let lastReminderSignature = '';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function syncLocalReminders(subscriptions: Subscription[], items: Item[], settings: AppSettings) {
  if (Platform.OS === 'web') return;

  const signature = JSON.stringify({
    enabled: settings.notificationEnabled,
    subscriptions: subscriptions
      .filter((item) => item.status === 'active')
      .map((item) => [item.id, item.name, item.price, item.currency, item.nextPaymentDate, item.notifyDaysBefore, item.status]),
    items: items.map((item) => [item.id, item.name, item.purchaseDate, item.lastUsedAt, item.idleAlertDays, item.condition, item.warrantyUntil]),
  });

  if (signature === lastReminderSignature) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: '续费与闲置提醒',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  lastReminderSignature = signature;
  if (!settings.notificationEnabled) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const now = new Date();

  for (const subscription of subscriptions.filter((item) => item.status === 'active')) {
    const reminderAt = subDays(parseISO(subscription.nextPaymentDate), subscription.notifyDaysBefore);
    if (!isAfter(reminderAt, now)) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${subscription.name} 即将续费`,
        body: `${subscription.notifyDaysBefore} 天后将扣款 ${money(subscription.price, subscription.currency)}，记得确认是否仍然需要。`,
        data: { type: 'subscription', id: subscription.id },
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger: reminderAt as unknown as Notifications.NotificationTriggerInput,
    });
  }

  for (const item of items) {
    const referenceDate = parseISO(item.lastUsedAt || item.purchaseDate);
    const reminderAt = addDays(referenceDate, item.idleAlertDays);
    if (!isAfter(reminderAt, now) || item.condition === 'retired') continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${item.name} 可能正在闲置`,
        body: `已经 ${item.idleAlertDays} 天没有记录使用，考虑使用、转赠或出售。`,
        data: { type: 'item', id: item.id },
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger: reminderAt as unknown as Notifications.NotificationTriggerInput,
    });

    if (item.warrantyUntil) {
      const warrantyReminderAt = subDays(parseISO(item.warrantyUntil), 7);
      if (isAfter(warrantyReminderAt, now)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${item.name} 保修即将到期`,
            body: `保修将在 7 天后到期，建议检查状态并保存发票/维修记录。`,
            data: { type: 'item_warranty', id: item.id },
            ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
          },
          trigger: warrantyReminderAt as unknown as Notifications.NotificationTriggerInput,
        });
      }
    }
  }
}
