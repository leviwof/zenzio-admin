// =============================================================================

import { isRecentNotification } from '../utils/notifications';
// desktopNotificationService.js — Production-grade notification service
//
// Responsibilities:
//   • Browser Notification API + Windows Notification Center
//   • ID-based deduplication (persists across refresh via localStorage)
//   • Sound deduplication per notification ID
//   • Multi-tab audio lock (prevents duplicate sounds across tabs)
//   • Permission management + denied-state export for UI banner
//   • Route resolution for notification click → navigate
//
// Storage keys:
//   admin_notif_alerted_ids   — IDs that already triggered sound + popup
//   admin_notif_sound_ids     — IDs whose sound was played
//   admin_notif_desktop_ids   — IDs that got an OS desktop notification
//   admin_notif_last_id       — highest notification ID seen
//   admin_notif_last_time     — createdAt of highest notification seen
//   admin_notif_audio_lock    — multi-tab leader lock { tabId, ts }
//   admin_notif_perm_asked    — whether permission was already requested
// =============================================================================

const ALERTED_IDS_KEY   = 'admin_notif_alerted_ids';
const SOUND_IDS_KEY     = 'admin_notif_sound_ids';
const DESKTOP_IDS_KEY   = 'admin_notif_desktop_ids';
const LAST_ID_KEY       = 'admin_notif_last_id';
const LAST_TIME_KEY     = 'admin_notif_last_time';
const AUDIO_LOCK_KEY    = 'admin_notif_audio_lock';
const PERM_ASKED_KEY    = 'admin_notif_perm_asked';

const MAX_STORED        = 1000;   // Req #12: max 1000 cached IDs
const AUDIO_LOCK_TTL    = 3000;   // Lock expires after 3s
const AUDIO_LOCK_JITTER = 0;      // No delay — single-tab is the common case; dedup prevents doubles

// ─── Notification type config ─────────────────────────────────────────────────

export const IMPORTANT_NOTIFICATION_TYPES = new Set([
  'NEW_ORDER', 'ORDER_RECEIVED',
  'ORDER_CANCELLED', 'ORDER_CANCELED', 'CANCELLED',
  'ORDER_ASSIGNED', 'DELIVERY_ASSIGNED',
  'DELIVERY_ISSUE', 'DELIVERY_FAILED',
  'PAYMENT_FAILURE', 'PAYMENT_FAILED',
  'RESTAURANT_ESCALATION',
  'HIGH_PRIORITY_ADMIN_ALERT', 'HIGH_PRIORITY_ALERT', 'ADMIN_ALERT',
  'ORDER_DELIVERED', 'STATUS_CHANGED', 'ORDER_REASSIGNED',
  'ORDER_OUT_FOR_DELIVERY', 'ORDER_PICKED_UP', 'PARTNER_ACCEPTED',
  'DELIVERY_CANCELLED', 'DELIVERY_CANCELLED_ADMIN', 'DELIVERY_STATUS_CHANGED_ADMIN',
  'NEW_DELIVERY_ASSIGNED', 'NEW_RESTAURANT_REGISTRATION', 'NEW_PARTNER_REGISTRATION',
]);

// Critical types → requireInteraction: true (stays pinned in Notification Center)
const REQUIRE_INTERACTION_TYPES = new Set([
  'NEW_ORDER', 'ORDER_RECEIVED',
  'ORDER_CANCELLED', 'ORDER_CANCELED', 'CANCELLED',
  'DELIVERY_ISSUE', 'DELIVERY_FAILED',
  'PAYMENT_FAILURE', 'PAYMENT_FAILED',
  'HIGH_PRIORITY_ADMIN_ALERT', 'HIGH_PRIORITY_ALERT', 'ADMIN_ALERT',
  'RESTAURANT_ESCALATION',
]);

const appIcon = `${import.meta.env.BASE_URL}logo.png`;

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readList(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function hasList(key, val) {
  if (val == null) return false;
  return readList(key).includes(String(val));
}

function addList(key, val) {
  if (val == null) return;
  const s = String(val);
  const list = readList(key).filter(v => v !== s);
  list.unshift(s);
  try { localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_STORED))); } catch {}
}

// ─── Field extractors ─────────────────────────────────────────────────────────

const normalizeType = v => String(v || '').trim().toUpperCase();

export function getNotificationType(n = {}) {
  return normalizeType(
    n.type || n.eventType || n.category || n.data?.type || n.data?.eventType
  );
}

export function getNotificationId(n = {}) {
  const id = n.id ?? n.notificationId ?? n.notification_id
    ?? n.data?.id ?? n.data?.notificationId;
  return id != null ? id : null;
}

export function getNotificationOrderId(n = {}) {
  return n.orderId ?? n.order_id ?? n.targetId ?? n.targetUid
    ?? n.data?.orderId ?? n.data?.order_id ?? n.data?.targetId ?? null;
}

export function getNotificationMessage(n = {}) {
  return n.message || n.body || n.description || n.data?.message || n.data?.body || '';
}

export function getNotificationCreatedAt(n = {}) {
  return n.createdAt || n.created_at || n.timestamp || null;
}

// ─── Last-seen tracking ───────────────────────────────────────────────────────

export function getStoredLastNotificationId() {
  return localStorage.getItem(LAST_ID_KEY);
}

export function getStoredLastNotificationTime() {
  return localStorage.getItem(LAST_TIME_KEY);
}

export function rememberLastNotification(n = {}) {
  const id = getNotificationId(n);
  if (id != null) localStorage.setItem(LAST_ID_KEY, String(id));
  const t = getNotificationCreatedAt(n);
  if (t) localStorage.setItem(LAST_TIME_KEY, String(t));
}

export function isNotificationNewer(n = {}, lastId, lastTime) {
  const id = getNotificationId(n);
  if (id == null) return false;

  // Numeric ID comparison (most reliable)
  const currNum = Number(id);
  const lastNum = Number(lastId);
  if (Number.isFinite(currNum) && Number.isFinite(lastNum)) {
    return currNum > lastNum;
  }

  // Timestamp fallback
  const currMs = Date.parse(getNotificationCreatedAt(n) || '');
  const lastMs = Date.parse(lastTime || '');
  if (Number.isFinite(currMs) && Number.isFinite(lastMs)) {
    return currMs > lastMs;
  }

  return String(id) !== String(lastId);
}

// ─── First-load seeding ───────────────────────────────────────────────────────
/**
 * Called ONCE after the initial API fetch on page load.
 * Pre-marks all existing notification IDs as already-alerted so that:
 *   1. Socket "catchup" events for historical notifications won't re-trigger
 *   2. Polling won't re-alert for notifications loaded during initial seed
 *   3. Works correctly on first-ever login (cold localStorage)
 *
 * @param {Array} notifications - notification list from initial API fetch
 */
export function seedAlertedIds(notifications = []) {
  if (!Array.isArray(notifications)) return;
  let count = 0;
  notifications.forEach(n => {
    const id = getNotificationId(n);
    if (id == null) return;
    const s = String(id);
    addList(ALERTED_IDS_KEY, s);
    addList(SOUND_IDS_KEY,   s);
    addList(DESKTOP_IDS_KEY, s);
    count++;
  });
  console.log(`[NotifDebug] seedAlertedIds: seeded ${count} existing notifications into all 3 dedup stores (ALERTED=${count}, SOUND=${count}, DESKTOP=${count})`);
}

// ─── Alert deduplication ──────────────────────────────────────────────────────
/**
 * "Claim" the right to alert for this notification (sound + desktop popup).
 * Returns true the FIRST time for this notification ID, false thereafter.
 * Stored in localStorage so it survives page refresh.
 */
export function claimAlert(n = {}) {
  const id = getNotificationId(n);

  if (!isRecentNotification(n)) {
    console.log(`[NotifDebug] claimAlert SKIPPED (not recent): id=${id}, type=${getNotificationType(n)}`);
    return false;
  }

  if (id == null) {
    console.log(`[NotifDebug] claimAlert ALLOWED (no id): type=${getNotificationType(n)}`);
    return true;
  }
  const s = String(id);
  if (hasList(ALERTED_IDS_KEY, s)) {
    console.log(`[NotifDebug] claimAlert SKIPPED (already alerted): id=${s}, type=${getNotificationType(n)}`);
    return false;
  }
  addList(ALERTED_IDS_KEY, s);
  console.log(`[NotifDebug] claimAlert CLAIMED: id=${s}, type=${getNotificationType(n)}`);
  return true;
}

// Legacy name kept for backwards compat
export { claimAlert as claimNotificationAlert };

// ─── Sound deduplication ──────────────────────────────────────────────────────

export function hasSoundPlayed(id) {
  if (id == null) return false;
  return hasList(SOUND_IDS_KEY, String(id));
}

export function markSoundPlayed(id) {
  if (id == null) return;
  addList(SOUND_IDS_KEY, String(id));
}

// ─── Multi-tab audio lock ─────────────────────────────────────────────────────
// Prevents multiple tabs from playing sound for the same event.
// Uses a localStorage lock with TTL + random jitter to reduce race conditions.

let _tabId = null;
function getTabId() {
  if (!_tabId) _tabId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return _tabId;
}

/**
 * Try to acquire the audio lock for this tab.
 * Returns a Promise<boolean>: true = this tab should play sound, false = skip.
 *
 * Random jitter (0–AUDIO_LOCK_JITTER ms) reduces the probability of two tabs
 * reading an empty lock simultaneously and both winning.
 */
export async function tryAcquireAudioLock() {
  // Random delay to desync concurrent tab reads
  await new Promise(r => setTimeout(r, Math.floor(Math.random() * AUDIO_LOCK_JITTER)));

  try {
    const raw = localStorage.getItem(AUDIO_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      const age = Date.now() - (lock.ts || 0);
      // Another tab has a fresh lock — skip
      if (age < AUDIO_LOCK_TTL && lock.tabId !== getTabId()) return false;
    }
    // Claim the lock
    localStorage.setItem(AUDIO_LOCK_KEY, JSON.stringify({ tabId: getTabId(), ts: Date.now() }));
    return true;
  } catch {
    return true; // localStorage error — allow sound
  }
}

// ─── Importance check ─────────────────────────────────────────────────────────

export function isImportantAdminNotification(n = {}) {
  if (!n || n.isRead) return false;
  const type = getNotificationType(n);
  if (IMPORTANT_NOTIFICATION_TYPES.has(type)) return true;

  const priority = normalizeType(n.priority || n.data?.priority);
  if (priority === 'HIGH' || priority === 'CRITICAL') return true;

  const text = `${n.title || ''} ${getNotificationMessage(n)}`.toLowerCase();
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
 * Returns current browser notification permission state.
 * 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function getPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Request permission once. Must be called inside a user-gesture handler
 * (click / form submit) to reliably show the browser permission prompt.
 */
export function requestDesktopNotificationPermissionOnce({ fromUserGesture = false } = {}) {
  if (!('Notification' in window) || !window.isSecureContext) {
    console.log(`[NotifDebug] requestPermission: unsupported (no API or non-secure context)`);
    return Promise.resolve('unsupported');
  }

  if (Notification.permission === 'granted') {
    return Promise.resolve('granted');
  }

  if (Notification.permission === 'denied') {
    console.log(`[NotifDebug] requestPermission: permission was DENIED by user — can't auto-request`);
    return Promise.resolve('denied');
  }

  // Always allow requesting from user gesture context
  // This ensures the browser permission prompt actually shows
  try {
    console.log(`[NotifDebug] requestPermission: calling Notification.requestPermission() (fromUserGesture=${fromUserGesture})`);
    const result = Notification.requestPermission();
    const promise = result && typeof result.then === 'function'
      ? result
      : Promise.resolve(result);
    promise.then(function(perm) {
      console.log(`[NotifDebug] requestPermission result: ${perm}`);
    });
    return promise;
  } catch (err) {
    console.log(`[NotifDebug] requestPermission error: ${err}`);
    return Promise.resolve(Notification.permission);
  }
}

/**
 * Force a full permission re-request (no caches, no guards).
 * Only works from a user gesture context.
 */
export async function requestNotificationPermissionFresh() {
  if (!('Notification' in window) || !window.isSecureContext) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    console.log(`[NotifDebug] requestNotificationPermissionFresh: ${result}`);
    return result;
  } catch (err) {
    console.log(`[NotifDebug] requestNotificationPermissionFresh error: ${err}`);
    return Notification.permission;
  }
}

// ─── Route resolution ─────────────────────────────────────────────────────────

function getRoute(n = {}, data = {}) {
  if (data.url) return data.url;
  const type    = getNotificationType(n) || normalizeType(data.type);
  const orderId = getNotificationOrderId(n) || data.orderId;
  const restId  = n.restaurantId || n.restaurant_id || n.data?.restaurantId || data.restaurantId;

  if (type === 'DELIVERY_ISSUE' || type === 'DELIVERY_FAILED')
    return orderId ? `/live-tracking?orderId=${encodeURIComponent(orderId)}` : '/live-tracking';
  if (type === 'RESTAURANT_ESCALATION')
    return restId ? `/restaurants/${restId}` : '/restaurants';
  if (type === 'NEW_RESTAURANT_REGISTRATION') return '/restaurants';
  if (type === 'NEW_PARTNER_REGISTRATION' || type === 'NEW_DELIVERY_ASSIGNED')
    return '/delivery-partners';
  if (['ORDER_CANCELLED','ORDER_CANCELED','CANCELLED',
       'ORDER_DELIVERED','DELIVERY_CANCELLED','DELIVERY_CANCELLED_ADMIN'].includes(type))
    return orderId ? `/orders/${orderId}` : '/orders';
  if (['HIGH_PRIORITY_ADMIN_ALERT','HIGH_PRIORITY_ALERT','ADMIN_ALERT'].includes(type))
    return '/activity-log';

  return orderId ? `/orders/${orderId}` : '/orders';
}

// ─── Content builder ──────────────────────────────────────────────────────────

export function buildDesktopNotificationContent(n = {}) {
  const type    = getNotificationType(n);
  const orderId = getNotificationOrderId(n);

  // Req #5: title is always "Zenzio Admin"; body = actual notification message
  const body = n.title
    || getNotificationMessage(n)
    || (() => {
      switch (type) {
        case 'NEW_ORDER':
        case 'ORDER_RECEIVED':              return orderId ? `🛒 New Order #${orderId}` : '🛒 New Order Received';
        case 'ORDER_ASSIGNED':
        case 'DELIVERY_ASSIGNED':           return `Order Assigned${orderId ? ` #${orderId}` : ''}`;
        case 'ORDER_DELIVERED':             return `Order Delivered${orderId ? ` #${orderId}` : ''}`;
        case 'ORDER_CANCELLED':
        case 'ORDER_CANCELED':
        case 'CANCELLED':                   return `Order Cancelled${orderId ? ` #${orderId}` : ''}`;
        case 'DELIVERY_ISSUE':
        case 'DELIVERY_FAILED':             return `⚠️ Delivery Issue${orderId ? ` — Order #${orderId}` : ''}`;
        case 'PAYMENT_FAILURE':
        case 'PAYMENT_FAILED':              return `⚠️ Payment Failed${orderId ? ` — Order #${orderId}` : ''}`;
        case 'RESTAURANT_ESCALATION':       return 'Restaurant Escalation';
        case 'NEW_RESTAURANT_REGISTRATION': return 'New Restaurant Registration';
        case 'NEW_PARTNER_REGISTRATION':    return 'New Delivery Partner Registered';
        case 'STATUS_CHANGED':
        case 'ORDER_REASSIGNED':            return `Status Updated${orderId ? ` — Order #${orderId}` : ''}`;
        case 'ORDER_OUT_FOR_DELIVERY':      return `Out for Delivery${orderId ? ` — #${orderId}` : ''}`;
        case 'ORDER_PICKED_UP':             return `Order Picked Up${orderId ? ` — #${orderId}` : ''}`;
        case 'PARTNER_ACCEPTED':            return `Partner Accepted Order${orderId ? ` #${orderId}` : ''}`;
        case 'DELIVERY_CANCELLED':
        case 'DELIVERY_CANCELLED_ADMIN':    return `Delivery Cancelled${orderId ? ` — #${orderId}` : ''}`;
        case 'HIGH_PRIORITY_ADMIN_ALERT':
        case 'HIGH_PRIORITY_ALERT':
        case 'ADMIN_ALERT':                 return 'Admin Alert — Action Required';
        default:                            return 'You have a new notification';
      }
    })();

  return { title: 'Zenzio Admin', body };
}

// ─── Show OS desktop notification ─────────────────────────────────────────────
/**
 * Fire a native OS notification (appears in Windows Notification Center).
 *
 * Requirements satisfied:
 *   #4  — requireInteraction: true for critical types
 *   #5  — title always "Zenzio Admin", body = actual content
 *   #6  — ID-based dedup via DESKTOP_IDS_KEY
 *   tag — stable per notification ID → replaces instead of stacking
 *
 * Returns true if the notification was fired, false if blocked/duped.
 */
export async function showDesktopNotification(body, data = {}) {
  if (!('Notification' in window)) {
    console.log(`[NotifDebug] showDesktopNotification SKIPPED: browser doesn't support Notification API`);
    return false;
  }

  // If permission is 'default', try requesting it right now (may work if called from user gesture)
  if (Notification.permission === 'default') {
    console.log(`[NotifDebug] showDesktopNotification: permission is 'default', attempting to request...`);
    try {
      const perm = await Notification.requestPermission();
      console.log(`[NotifDebug] showDesktopNotification: requestPermission returned "${perm}"`);
    } catch (err) {
      console.log(`[NotifDebug] showDesktopNotification: requestPermission threw: ${err}`);
    }
  }

  if (Notification.permission !== 'granted') {
    console.log(`[NotifDebug] showDesktopNotification SKIPPED: permission="${Notification.permission}" (needs "granted")`);
    return false;
  }

  const n  = data.notification || {};
  if (!isRecentNotification(n)) {
    console.log(`[NotifDebug] showDesktopNotification SKIPPED (not recent): type=${getNotificationType(n)}, id=${getNotificationId(n)}`);
    return false;
  }

  const notifId = getNotificationId(n) ?? data.notificationId ?? data.id;

  // Dedup: never show the same notification ID twice
  if (notifId != null) {
    const s = String(notifId);
    if (hasList(DESKTOP_IDS_KEY, s)) {
      console.log(`[NotifDebug] showDesktopNotification SKIPPED (already shown): id=${s}, type=${getNotificationType(n)}`);
      return false;
    }
    addList(DESKTOP_IDS_KEY, s);
  }

  const type = getNotificationType(n) || normalizeType(data.type);
  const isRequireInteraction = REQUIRE_INTERACTION_TYPES.has(type);
  const tag  = notifId ? `zenzio-${notifId}` : `zenzio-${Date.now()}`;

  try {
    const popup = new Notification('Zenzio Admin', {
      body:               body || 'You have a new notification',
      icon:               appIcon,
      badge:              appIcon,
      tag,
      renotify:           isRequireInteraction,
      requireInteraction: isRequireInteraction,
      silent:             data.silent === true,
      data,
    });

    console.log(`[NotifDebug] showDesktopNotification FIRED: body="${body?.slice(0, 60)}", tag=${tag}, type=${type}, requireInteraction=${isRequireInteraction}`);

    popup.onclick = () => {
      try {
        window.focus();
        const route = getRoute(n, data);
        if (route && window.location.pathname + window.location.search !== route) {
          window.location.href = route;
        }
      } finally { popup.close(); }
    };

    return true;
  } catch (err) {
    console.log(`[NotifDebug] showDesktopNotification ERROR: ${err}`);
    return false;
  }
}
