import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type { StockItem } from './friskr';

const CHANNEL_ID = 'expiry-reminders';
const ID_BASE = 100_000_000;
const ID_RANGE = 2_000_000_000;
let syncQueue = Promise.resolve();

function notificationId(stockItemId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < stockItemId.length; i += 1) {
    hash ^= stockItemId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ID_BASE + ((hash >>> 0) % ID_RANGE);
}

export function buildExpiryNotifications(
  items: StockItem[],
  defaultDaysBefore: number,
  now = new Date(),
): LocalNotificationSchema[] {
  return items.flatMap((item) => {
    if (!item.expiryDate) return [];
    const daysBefore = item.reminderDaysBefore ?? defaultDaysBefore;
    if (daysBefore < 0) return [];

    const at = new Date(item.expiryDate);
    at.setDate(at.getDate() - daysBefore);
    at.setHours(9, 0, 0, 0);
    if (at.getTime() <= now.getTime()) return [];

    return [{
      id: notificationId(item.id),
      title: `${item.product.name} utløper snart`,
      body: daysBefore === 0
        ? 'Utløpsdatoen er i dag.'
        : `Utløper om ${daysBefore} dag${daysBefore === 1 ? '' : 'er'}.`,
      schedule: { at, allowWhileIdle: true },
      channelId: CHANNEL_ID,
      extra: { kind: 'friskr-expiry', stockItemId: item.id },
    }];
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

async function performSync(items: StockItem[], enabled: boolean, defaultDaysBefore: number) {
  if (!Capacitor.isNativePlatform()) return;

  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter((notification) =>
    notification.id >= ID_BASE || notification.extra?.kind === 'friskr-expiry'
  );
  if (ours.length > 0) {
    await LocalNotifications.cancel({ notifications: ours.map(({ id }) => ({ id })) });
  }
  if (!enabled) return;

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return;

  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Utløpsdatoer',
      description: 'Påminnelser om mat som snart utløper',
      importance: 4,
    });
  }

  const notifications = buildExpiryNotifications(items, defaultDaysBefore);
  if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
}

export function syncExpiryNotifications(items: StockItem[], enabled: boolean, defaultDaysBefore: number) {
  syncQueue = syncQueue
    .catch(() => undefined)
    .then(() => performSync(items, enabled, defaultDaysBefore));
  return syncQueue;
}

export async function clearExpiryNotifications() {
  await syncExpiryNotifications([], false, 0);
}
