const PERMISSION_REQUESTED_KEY = 'admin_desktop_notification_permission_requested';
const ALERTED_KEYS_STORAGE = 'admin_alerted_notification_keys';
const DESKTOP_KEYS_STORAGE = 'admin_desktop_notification_keys';
const LAST_NOTIFICATION_ID_KEY = 'admin_last_notification_id';
const LAST_NOTIFICATION_TIME_KEY = 'admin_last_notification_time';
const MAX_STORED_KEYS = 300;

export const IMPORTANT_NOTIFICATION_TYPES = new Set([
  'NEW_ORDER',
  'ORDER_RECEIVED',
  'ORDER_CANCELLED',
  'ORDER_CANCELED',
  'CANCELLED',
  'ORDER_ASSIGNED',
  'DELIVERY_ASSIGNED',
  'DELIVERY_ISSUE',
  'DELIVERY_FAILED',
  'PAYMENT_FAILURE',
  'PAYMENT_FAILED',
  'RESTAURANT_ESCALATION',
  'HIGH_PRIORITY_ADMIN_ALERT',
  'HIGH_PRIORITY_ALERT',
  'ADMIN_ALERT',
]);

const appIcon = `${import.meta.env.BASE_URL}logo.png`;

const normalizeType = (value) => String(value || '').trim().toUpperCase();

export function getNotificationType(notification = {}) {
  return normalizeType(
    notification.type ||
      notification.eventType ||
      notification.category ||
      notification.data?.type ||
      notification.data?.eventType,
  );
}

export function getNotificationId(notification = {}) {
  return (
    notification.id ||
    notification.notificationId ||
    notification.notification_id ||
    notification.data?.id ||
    notification.data?.notificationId ||
    null
  );
}

export function getNotificationOrderId(notification = {}) {
  return (
    notification.orderId ||
    notification.order_id ||
    notification.targetId ||
    notification.targetUid ||
    notification.data?.orderId ||
    notification.data?.order_id ||
    notification.data?.targetId ||
    null
  );
}

export function getNotificationMessage(notification = {}) {
  return (
    notification.message ||
    notification.body ||
    notification.description ||
    notification.data?.message ||
    notification.data?.body ||
    ''
  );
}

function readKeyList(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasStoredKey(storageKey, key) {
  if (!key) return false;
  return readKeyList(storageKey).includes(key);
}

function storeKey(storageKey, key) {
  if (!key) return;
  const keys = readKeyList(storageKey).filter((item) => item !== key);
  keys.unshift(key);
  localStorage.setItem(storageKey, JSON.stringify(keys.slice(0, MAX_STORED_KEYS)));
}

function getDedupeKey(notification = {}, data = {}) {
  if (data.dedupeKey) return String(data.dedupeKey);

  const type = getNotificationType(notification) || normalizeType(data.type) || 'GENERAL';
  const orderId = getNotificationOrderId(notification) || data.orderId;
  if (orderId) return `${type}:order:${orderId}`;

  const restaurantId =
    notification.restaurantId ||
    notification.restaurant_id ||
    notification.data?.restaurantId ||
    data.restaurantId;
  if (restaurantId) return `${type}:restaurant:${restaurantId}`;

  const id = getNotificationId(notification) || data.notificationId || data.id;
  return id ? `${type}:id:${id}` : null;
}

export function getStoredLastNotificationId() {
  return localStorage.getItem(LAST_NOTIFICATION_ID_KEY);
}

export function getStoredLastNotificationTime() {
  return localStorage.getItem(LAST_NOTIFICATION_TIME_KEY);
}

export function rememberLastNotification(notification = {}) {
  const id = getNotificationId(notification);
  if (id !== null && id !== undefined) {
    localStorage.setItem(LAST_NOTIFICATION_ID_KEY, String(id));
  }

  const createdAt = notification.createdAt || notification.created_at || notification.timestamp;
  if (createdAt) {
    localStorage.setItem(LAST_NOTIFICATION_TIME_KEY, String(createdAt));
  }
}

export function isNotificationNewer(notification = {}, lastId, lastTime) {
  const id = getNotificationId(notification);
  if (id === null || id === undefined) return false;

  const currentNumeric = Number(id);
  const lastNumeric = Number(lastId);
  if (Number.isFinite(currentNumeric) && Number.isFinite(lastNumeric)) {
    return currentNumeric > lastNumeric;
  }

  const currentTime = Date.parse(notification.createdAt || notification.created_at || notification.timestamp || '');
  const previousTime = Date.parse(lastTime || '');
  if (Number.isFinite(currentTime) && Number.isFinite(previousTime)) {
    return currentTime > previousTime;
  }

  return String(id) !== String(lastId);
}

export function requestDesktopNotificationPermissionOnce() {
  if (!('Notification' in window)) return Promise.resolve('unsupported');
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Promise.resolve(Notification.permission);
  }
  if (localStorage.getItem(PERMISSION_REQUESTED_KEY) === 'true') {
    return Promise.resolve(Notification.permission);
  }

  localStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
  try {
    return Notification.requestPermission();
  } catch {
    return Promise.resolve(Notification.permission);
  }
}

export function isImportantAdminNotification(notification = {}) {
  if (!notification || notification.isRead) return false;

  const type = getNotificationType(notification);
  if (IMPORTANT_NOTIFICATION_TYPES.has(type)) return true;

  const priority = normalizeType(notification.priority || notification.data?.priority);
  if (priority === 'HIGH' || priority === 'CRITICAL') return true;

  const text = `${notification.title || ''} ${getNotificationMessage(notification)}`.toLowerCase();
  return (
    (text.includes('new order') || text.includes('order received')) ||
    (text.includes('order') && text.includes('cancel')) ||
    (text.includes('order') && text.includes('assigned')) ||
    text.includes('delivery issue') ||
    (text.includes('payment') && (text.includes('failed') || text.includes('failure'))) ||
    text.includes('restaurant escalation') ||
    text.includes('high priority')
  );
}

export function claimNotificationAlert(notification = {}, data = {}) {
  const key = getDedupeKey(notification, data);
  if (!key || hasStoredKey(ALERTED_KEYS_STORAGE, key)) return false;
  storeKey(ALERTED_KEYS_STORAGE, key);
  return true;
}

function getNotificationRoute(notification = {}, data = {}) {
  if (data.url) return data.url;

  const type = getNotificationType(notification) || normalizeType(data.type);
  const orderId = getNotificationOrderId(notification) || data.orderId;
  const restaurantId =
    notification.restaurantId ||
    notification.restaurant_id ||
    notification.data?.restaurantId ||
    data.restaurantId;

  if (type === 'DELIVERY_ISSUE' || type === 'DELIVERY_FAILED') {
    return orderId ? `/live-tracking?orderId=${encodeURIComponent(orderId)}` : '/live-tracking';
  }

  if (type === 'RESTAURANT_ESCALATION') {
    return restaurantId ? `/restaurants/${restaurantId}` : '/restaurants';
  }

  if (type === 'ORDER_CANCELLED' || type === 'ORDER_CANCELED' || type === 'CANCELLED') {
    return '/orders';
  }

  if (type === 'HIGH_PRIORITY_ADMIN_ALERT' || type === 'HIGH_PRIORITY_ALERT' || type === 'ADMIN_ALERT') {
    return '/activity-log';
  }

  return orderId ? `/orders/${orderId}` : '/orders';
}

export function buildDesktopNotificationContent(notification = {}) {
  const type = getNotificationType(notification);
  const orderId = getNotificationOrderId(notification);
  const title =
    notification.title ||
    (type === 'NEW_ORDER' || type === 'ORDER_RECEIVED'
      ? 'New Order Received'
      : type === 'ORDER_ASSIGNED'
        ? 'Order Assigned'
        : type === 'DELIVERY_ISSUE' || type === 'DELIVERY_FAILED'
          ? 'Delivery Issue'
          : type === 'PAYMENT_FAILURE' || type === 'PAYMENT_FAILED'
            ? 'Payment Failure'
            : type === 'RESTAURANT_ESCALATION'
              ? 'Restaurant Escalation'
              : 'Admin Alert');

  const message =
    getNotificationMessage(notification) ||
    (orderId ? `Order #${orderId} needs your attention` : 'A new admin notification needs your attention');

  return { title, message };
}

export function showDesktopNotification(title, message, data = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;

  const notification = data.notification || data;
  const key = getDedupeKey(notification, data);
  if (key && hasStoredKey(DESKTOP_KEYS_STORAGE, key)) return false;
  if (key) storeKey(DESKTOP_KEYS_STORAGE, key);

  try {
    const popup = new Notification(title || 'Zenzio Admin', {
      body: message || '',
      icon: data.icon || appIcon,
      badge: data.icon || appIcon,
      tag: data.tag || key || `admin-notification-${Date.now()}`,
      renotify: false,
      silent: true,
      data,
    });

    popup.onclick = () => {
      try {
        window.focus();
        const route = getNotificationRoute(notification, data);
        if (route && window.location.pathname + window.location.search !== route) {
          window.location.href = route;
        }
      } finally {
        popup.close();
      }
    };

    return true;
  } catch {
    return false;
  }
}
