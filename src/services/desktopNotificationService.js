// ─────────────────────────────────────────────────────────────────────────────
// desktopNotificationService.js
// Handles:
//   • Browser Notification API (Windows Notification Center)
//   • Notification deduplication (ID-first, composite-key fallback)
//   • Sound deduplication per notification ID
//   • Permission management
//   • Route resolution for notification click → navigate
// ─────────────────────────────────────────────────────────────────────────────

const PERMISSION_REQUESTED_KEY       = 'admin_desktop_notification_permission_requested';
const ALERTED_KEYS_STORAGE           = 'admin_alerted_notification_keys';
const NOTIFIED_IDS_STORAGE           = 'admin_notified_notification_ids';  // desktop popup dedupe
const SOUND_IDS_STORAGE              = 'admin_sound_notification_ids';     // sound dedupe
const LAST_NOTIFICATION_ID_KEY       = 'admin_last_notification_id';
const LAST_NOTIFICATION_TIME_KEY     = 'admin_last_notification_time';
const MAX_STORED_KEYS                = 500;

// ─── Notification type sets ───────────────────────────────────────────────────

/**
 * All notification types that should trigger desktop popups + sound.
 */
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
  'ORDER_DELIVERED',
  'STATUS_CHANGED',
  'ORDER_REASSIGNED',
  'ORDER_OUT_FOR_DELIVERY',
  'ORDER_PICKED_UP',
  'PARTNER_ACCEPTED',
  'DELIVERY_CANCELLED',
  'DELIVERY_CANCELLED_ADMIN',
  'DELIVERY_STATUS_CHANGED_ADMIN',
  'NEW_DELIVERY_ASSIGNED',
  'NEW_RESTAURANT_REGISTRATION',
  'NEW_PARTNER_REGISTRATION',
]);

/**
 * Critical types use requireInteraction=true so the notification stays in
 * Windows Notification Center until the admin explicitly dismisses it.
 */
const REQUIRE_INTERACTION_TYPES = new Set([
  'NEW_ORDER',
  'ORDER_RECEIVED',
  'ORDER_CANCELLED',
  'ORDER_CANCELED',
  'CANCELLED',
  'DELIVERY_ISSUE',
  'DELIVERY_FAILED',
  'PAYMENT_FAILURE',
  'PAYMENT_FAILED',
  'HIGH_PRIORITY_ADMIN_ALERT',
  'HIGH_PRIORITY_ALERT',
  'ADMIN_ALERT',
  'RESTAURANT_ESCALATION',
]);

// ─── Icon ─────────────────────────────────────────────────────────────────────

const appIcon = `${import.meta.env.BASE_URL}logo.png`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeType = (value) => String(value || '').trim().toUpperCase();

function readKeyList(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasStoredKey(storageKey, key) {
  if (key === null || key === undefined) return false;
  return readKeyList(storageKey).includes(String(key));
}

function storeKey(storageKey, key) {
  if (key === null || key === undefined) return;
  const sKey = String(key);
  const keys = readKeyList(storageKey).filter((k) => k !== sKey);
  keys.unshift(sKey);
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys.slice(0, MAX_STORED_KEYS)));
  } catch {
    // localStorage full — not fatal
  }
}

// ─── Public getters / setters ─────────────────────────────────────────────────

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

  const currentTime = Date.parse(
    notification.createdAt || notification.created_at || notification.timestamp || '',
  );
  const previousTime = Date.parse(lastTime || '');
  if (Number.isFinite(currentTime) && Number.isFinite(previousTime)) {
    return currentTime > previousTime;
  }

  return String(id) !== String(lastId);
}

// ─── Sound deduplication ──────────────────────────────────────────────────────

/**
 * Returns true if sound has already been played for this notification ID.
 * Checks localStorage so duplicates survive page refresh.
 */
export function hasSoundPlayed(notifId) {
  if (notifId === null || notifId === undefined) return false;
  return hasStoredKey(SOUND_IDS_STORAGE, String(notifId));
}

/**
 * Record that sound was played for this notification ID.
 */
export function markSoundPlayed(notifId) {
  if (notifId === null || notifId === undefined) return;
  storeKey(SOUND_IDS_STORAGE, String(notifId));
}

// ─── Alert claiming (sound + desktop) ────────────────────────────────────────

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

/**
 * "Claim" the right to alert (play sound + show desktop notification) for this
 * notification. Returns true the first time, false on subsequent calls.
 *
 * Deduplication priority:
 *   1. notification.id  (most precise — survives re-render & page refresh)
 *   2. composite key   (type + orderId / restaurantId — fallback when ID absent)
 */
export function claimNotificationAlert(notification = {}, data = {}) {
  const id = getNotificationId(notification);

  if (id !== null && id !== undefined) {
    const idKey = `id:${String(id)}`;
    if (hasStoredKey(ALERTED_KEYS_STORAGE, idKey)) return false;
    storeKey(ALERTED_KEYS_STORAGE, idKey);
    return true;
  }

  // Fallback to composite key
  const key = getDedupeKey(notification, data);
  if (!key || hasStoredKey(ALERTED_KEYS_STORAGE, key)) return false;
  storeKey(ALERTED_KEYS_STORAGE, key);
  return true;
}

// ─── isImportantAdminNotification ────────────────────────────────────────────

export function isImportantAdminNotification(notification = {}) {
  if (!notification || notification.isRead) return false;

  const type = getNotificationType(notification);
  if (IMPORTANT_NOTIFICATION_TYPES.has(type)) return true;

  const priority = normalizeType(notification.priority || notification.data?.priority);
  if (priority === 'HIGH' || priority === 'CRITICAL') return true;

  const text = `${notification.title || ''} ${getNotificationMessage(notification)}`.toLowerCase();
  return (
    text.includes('new order') ||
    text.includes('order received') ||
    (text.includes('order') && text.includes('cancel')) ||
    (text.includes('order') && text.includes('assigned')) ||
    text.includes('delivery issue') ||
    (text.includes('payment') && (text.includes('failed') || text.includes('failure'))) ||
    text.includes('restaurant escalation') ||
    text.includes('high priority')
  );
}

// ─── Permission management ────────────────────────────────────────────────────

/**
 * Request browser notification permission.
 *
 * - Must be called inside a user-gesture handler (click/submit) to reliably
 *   show the browser permission prompt.
 * - Stores a flag so we don't prompt again after the user has already decided.
 * - Safe to call multiple times; only prompts once unless permission was reset.
 *
 * Returns a Promise<NotificationPermission | 'unsupported'>
 */
export function requestDesktopNotificationPermissionOnce({ fromUserGesture = false } = {}) {
  // Not supported or not secure
  if (!('Notification' in window) || !window.isSecureContext) {
    return Promise.resolve('unsupported');
  }

  // Already decided — nothing to do
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Promise.resolve(Notification.permission);
  }

  const requestState = localStorage.getItem(PERMISSION_REQUESTED_KEY);

  // Avoid prompting again from a non-gesture context if we've already tried
  if (requestState === 'interaction' || (requestState === 'load' && !fromUserGesture)) {
    return Promise.resolve(Notification.permission);
  }

  localStorage.setItem(PERMISSION_REQUESTED_KEY, fromUserGesture ? 'interaction' : 'load');

  try {
    const result = Notification.requestPermission();
    // Older browsers return the result synchronously (not a Promise)
    return result && typeof result.then === 'function'
      ? result
      : Promise.resolve(result);
  } catch {
    return Promise.resolve(Notification.permission);
  }
}

// ─── Route resolution ─────────────────────────────────────────────────────────

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
    return orderId
      ? `/live-tracking?orderId=${encodeURIComponent(orderId)}`
      : '/live-tracking';
  }

  if (type === 'RESTAURANT_ESCALATION') {
    return restaurantId ? `/restaurants/${restaurantId}` : '/restaurants';
  }

  if (type === 'NEW_RESTAURANT_REGISTRATION') return '/restaurants';
  if (type === 'NEW_PARTNER_REGISTRATION')    return '/delivery-partners';
  if (type === 'NEW_DELIVERY_ASSIGNED')       return '/delivery-partners';

  if (
    type === 'ORDER_CANCELLED' ||
    type === 'ORDER_CANCELED'  ||
    type === 'CANCELLED'       ||
    type === 'ORDER_DELIVERED' ||
    type === 'DELIVERY_CANCELLED' ||
    type === 'DELIVERY_CANCELLED_ADMIN'
  ) {
    return orderId ? `/orders/${orderId}` : '/orders';
  }

  if (
    type === 'HIGH_PRIORITY_ADMIN_ALERT' ||
    type === 'HIGH_PRIORITY_ALERT'       ||
    type === 'ADMIN_ALERT'
  ) {
    return '/activity-log';
  }

  return orderId ? `/orders/${orderId}` : '/orders';
}

// ─── Content builder ──────────────────────────────────────────────────────────

export function buildDesktopNotificationContent(notification = {}) {
  const type = getNotificationType(notification);
  const orderId = getNotificationOrderId(notification);

  const title =
    notification.title ||
    (() => {
      switch (type) {
        case 'NEW_ORDER':
        case 'ORDER_RECEIVED':             return '🛒 New Order Received';
        case 'ORDER_ASSIGNED':
        case 'DELIVERY_ASSIGNED':          return 'Order Assigned';
        case 'ORDER_DELIVERED':            return 'Order Delivered';
        case 'ORDER_CANCELLED':
        case 'ORDER_CANCELED':
        case 'CANCELLED':                  return 'Order Cancelled';
        case 'DELIVERY_ISSUE':
        case 'DELIVERY_FAILED':            return '⚠️ Delivery Issue';
        case 'PAYMENT_FAILURE':
        case 'PAYMENT_FAILED':             return '⚠️ Payment Failed';
        case 'RESTAURANT_ESCALATION':      return 'Restaurant Escalation';
        case 'NEW_RESTAURANT_REGISTRATION': return 'New Restaurant Registration';
        case 'NEW_PARTNER_REGISTRATION':   return 'New Partner Registration';
        case 'STATUS_CHANGED':
        case 'ORDER_REASSIGNED':           return 'Status Updated';
        case 'ORDER_OUT_FOR_DELIVERY':     return 'Out for Delivery';
        case 'ORDER_PICKED_UP':            return 'Order Picked Up';
        case 'PARTNER_ACCEPTED':           return 'Partner Accepted Order';
        case 'DELIVERY_CANCELLED':
        case 'DELIVERY_CANCELLED_ADMIN':   return 'Delivery Cancelled';
        default:                           return 'Admin Alert';
      }
    })();

  const message =
    getNotificationMessage(notification) ||
    (orderId
      ? `Order #${orderId} needs your attention`
      : 'A new admin notification needs your attention');

  return { title, message };
}

// ─── Show desktop notification ────────────────────────────────────────────────

/**
 * Fire a native OS desktop notification.
 *
 * Deduplication:
 *   • Uses notification.id as primary key (stored in localStorage).
 *   • Falls back to composite type:order/restaurant:id key.
 *
 * Windows Notification Center behaviour:
 *   • REQUIRE_INTERACTION_TYPES → requireInteraction:true, notification stays
 *     visible until dismissed.
 *   • tag uses the notification ID so repeated events for the same notification
 *     replace rather than stack.
 *   • renotify:true on REQUIRE_INTERACTION types so the sound/banner re-fires
 *     if the tag already exists (e.g. real-time socket duplicate).
 *
 * Click behaviour:
 *   • window.focus() brings the admin tab to the foreground.
 *   • window.location.href navigates to the relevant page.
 *
 * Returns true if the notification was fired, false otherwise.
 */
export function showDesktopNotification(title, message, data = {}) {
  // Guard: API available + permission granted
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const notification = data.notification || {};
  const id = getNotificationId(notification) || data.notificationId || data.id;

  // ── Deduplication ──────────────────────────────────────────────────────────
  if (id !== null && id !== undefined) {
    if (hasStoredKey(NOTIFIED_IDS_STORAGE, String(id))) return false;
    storeKey(NOTIFIED_IDS_STORAGE, String(id));
  } else {
    // No ID — fall back to composite key
    const key = getDedupeKey(notification, data);
    if (key && hasStoredKey(ALERTED_KEYS_STORAGE, key)) return false;
    if (key) storeKey(ALERTED_KEYS_STORAGE, key);
  }

  // ── Notification options ───────────────────────────────────────────────────
  const type = getNotificationType(notification) || normalizeType(data.type);
  const isRequireInteraction = REQUIRE_INTERACTION_TYPES.has(type);

  // Stable tag: same notification.id → replace, not stack; avoids flood
  const tag = id
    ? `zenzio-notif-${id}`
    : (getDedupeKey(notification, data) || `zenzio-notif-${Date.now()}`);

  try {
    const popup = new Notification(title || 'Zenzio Admin', {
      body:               message || '',
      icon:               data.icon  || appIcon,
      badge:              data.badge || appIcon,
      tag,
      // renotify only for critical types so each real new order re-fires the banner
      renotify:           isRequireInteraction,
      requireInteraction: isRequireInteraction,
      // silent:true because we play notification.mp3 ourselves; avoids double-sound
      silent:             true,
      data,
    });

    popup.onclick = () => {
      try {
        // Bring the admin browser tab to the foreground
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
