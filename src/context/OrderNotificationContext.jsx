import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from "react";
import useAdminNotifications from "../hooks/useAdminNotifications";
import useRestaurantNotifications from "../hooks/useRestaurantNotifications";
import { isRecentNotification, getNotificationTimestamp } from "../utils/notifications";
import { isRestaurantAdmin, getCurrentRestaurantUid } from "../utils/auth";
import { getAllOrders } from "../services/api";
import {
  showDesktopNotification as showNativeDesktopNotification,
  tryAcquireAudioLock,
} from "../services/desktopNotificationService";

const OrderNotificationContext = createContext(null);

// Notification types that increment the order badge counter
const ORDER_BADGE_TYPES = new Set([
  'NEW_ORDER', 'ORDER_RECEIVED',
  'ORDER_CANCELLED', 'ORDER_CANCELED', 'CANCELLED',
]);

// Notification types that show an in-app popup toast
const POPUP_TYPES = new Set([
  'NEW_ORDER', 'ORDER_RECEIVED',
  'ORDER_CANCELLED', 'ORDER_CANCELED', 'CANCELLED',
  'DELIVERY_ISSUE', 'DELIVERY_FAILED',
  'PAYMENT_FAILURE', 'PAYMENT_FAILED',
  'ORDER_DELIVERED', 'ORDER_OUT_FOR_DELIVERY',
  'NEW_RESTAURANT_REGISTRATION', 'NEW_PARTNER_REGISTRATION',
  'HIGH_PRIORITY_ADMIN_ALERT', 'HIGH_PRIORITY_ALERT', 'ADMIN_ALERT',
]);

// Global polling interval (ms) — runs for the lifetime of the authenticated session
const GLOBAL_POLL_INTERVAL = 15_000;
// In-app toast auto-dismiss (ms)
const TOAST_DURATION = 9_000;
const TOAST_EXIT_MS = 350;

export const OrderNotificationProvider = ({ children }) => {
  const [unreadOrderCount, setUnreadOrderCount] = useState(0);
  const [newOrders,        setNewOrders]         = useState([]);
  const [syntheticNotifs,  setSyntheticNotifs]   = useState([]);
  const [socketNotifs,     setSocketNotifs]       = useState([]);
  const [popupQueue,       setPopupQueue]         = useState([]);

  // ── Global "New Order" toast (shown on every page) ──────────────────────────
  const [orderToasts,      setOrderToasts]        = useState([]);
  const toastIdCounter = useRef(0);

  const lastResetTime    = useRef(Date.now());
  const notifIdCounter   = useRef(0);
  const popupSeenIds     = useRef(new Set());
  const apiSeededRef     = useRef(false);

  // ── Global order polling state ───────────────────────────────────────────────
  // Audio element exclusively for polling-detected new order alerts.
  // (Socket-triggered alerts use the audio in useAdminNotifications.)
  const pollAudioRef       = useRef(null);
  const pollAudioUnlocked  = useRef(false);
  const pendingPollSound   = useRef(false);

  // Known order IDs from last poll — used to detect genuinely new arrivals
  const knownOrderIdsRef   = useRef(new Set());
  // Orders that have already triggered a notification (socket OR poll path)
  const notifiedOrderIdsRef = useRef(new Set());
  const firstPollRef       = useRef(true);
  const isPollingRef       = useRef(false);

  // Callbacks registered by OrdersList to receive the new-orders list so it
  // can refresh its table display and highlight the new rows.
  const newOrderCallbacksRef = useRef([]);

  // Stable ref so the setInterval closure always calls the latest pollOrders
  const pollOrdersRef = useRef(null);

  // Detect role once — does not change during a session
  const _isRestAdmin   = useMemo(() => isRestaurantAdmin(), []);
  const _restaurantUid = useMemo(() => getCurrentRestaurantUid(), []);

  // ── Play poll-detected notification sound ────────────────────────────────────
  const playPollSound = useCallback(async () => {
    if (!pollAudioRef.current) {
      console.log('[SOUND] Audio play failed — no audio element (poll path)');
      return;
    }
    const hasLock = await tryAcquireAudioLock();
    if (!hasLock) {
      console.log('[SOUND] Audio play skipped — another tab holds the audio lock (poll path)');
      return;
    }
    console.log('[SOUND] Audio play started: ' + pollAudioRef.current.src + ' (poll path)');
    try {
      pollAudioRef.current.currentTime = 0;
      await pollAudioRef.current.play();
      pollAudioUnlocked.current = true;
      pendingPollSound.current = false;
      console.log('[SOUND] Audio play success (poll path)');
    } catch (e) {
      pendingPollSound.current = true;
      console.log('[SOUND] Audio play failed (autoplay blocked — needs user interaction first, poll path): ' + e);
    }
  }, []);

  // ── Global order poll ────────────────────────────────────────────────────────
  // Runs every GLOBAL_POLL_INTERVAL ms for the entire authenticated session.
  // Detects orders that arrive between socket events (socket is primary;
  // polling is the reliable fallback).
  const pollOrders = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const params = _isRestAdmin && _restaurantUid
        ? { restaurant_uid: _restaurantUid }
        : {};

      const res = await getAllOrders(params);
      const raw = res.data?.data || res.data || [];
      const fetched = Array.isArray(raw)
        ? (_isRestAdmin && _restaurantUid
            ? raw.filter(o =>
                o.restaurant_uid === _restaurantUid ||
                o.restaurantUid  === _restaurantUid ||
                o.restaurant?.uid === _restaurantUid)
            : raw)
        : [];

      const newIds = new Set(fetched.map(o => String(o.orderId || o.id)));

      if (!firstPollRef.current && knownOrderIdsRef.current.size > 0) {
        const newlyArrived = fetched.filter(o => {
          const id = String(o.orderId || o.id);
          return (
            !knownOrderIdsRef.current.has(id) &&
            !notifiedOrderIdsRef.current.has(id) &&
            isRecentNotification(o)
          );
        });

        if (newlyArrived.length > 0) {
          console.log(
            `[GLOBAL NOTIFICATION] Poll detected new order — count=${newlyArrived.length}`,
            newlyArrived.map(o => ({ id: o.orderId || o.id, status: o.restaurantStatus || o.status })),
          );

          // Mark as notified so neither the next poll cycle nor a socket event
          // duplicates the alert for the same orderId.
          newlyArrived.forEach(o => {
            notifiedOrderIdsRef.current.add(String(o.orderId || o.id));
          });

          // In-app global toast (top-right card with order details)
          const first = newlyArrived[0];
          const toastId = ++toastIdCounter.current;
          const toastEntry = {
            id: toastId,
            orderId: first.orderId || first.id,
            customerName: first.customer_name || first.customer || 'Guest',
            restaurantName: first.restaurant_name || 'Unknown Restaurant',
            amount: first.price,
            time: first.time || first.createdAt,
            exiting: false,
          };
          setOrderToasts([toastEntry]);
          setTimeout(() => {
            setOrderToasts(prev => prev.map(t => t.id === toastId ? { ...t, exiting: true } : t));
            setTimeout(() => setOrderToasts(prev => prev.filter(t => t.id !== toastId)), TOAST_EXIT_MS);
          }, TOAST_DURATION);

          // Popup queue (existing NotificationPopup at bottom-right)
          newlyArrived.forEach(order => addNewOrderNotification(order));

          // Sound
          await playPollSound();

          // OS desktop notification (works even when browser is minimized)
          const orderId = first.orderId || first.id;
          const notifCount = newlyArrived.length;
          const notifBody = notifCount === 1
            ? (first.restaurant_name
                ? `${first.customer_name || 'Guest'} — ${first.restaurant_name} — ₹${first.price}`
                : `Order #${orderId} — ₹${first.price}`)
            : `${notifCount} new orders arrived`;

          const fakeNotif = {
            id: `poll-${orderId}`,
            type: 'NEW_ORDER',
            orderId,
            restaurantName: first.restaurant_name,
            createdAt: first.createdAt || first.time || new Date().toISOString(),
          };
          showNativeDesktopNotification(notifBody, {
            notification: fakeNotif,
            type: 'NEW_ORDER',
            orderId,
          });
          console.log('[GLOBAL NOTIFICATION] Desktop notification fired');

          // Notify OrdersList (if mounted) to refresh its table and highlight rows
          newOrderCallbacksRef.current.forEach(fn => {
            try { fn(newlyArrived); } catch {}
          });
        }
      }

      firstPollRef.current = false;
      knownOrderIdsRef.current = newIds;
    } catch (err) {
      console.error('[GLOBAL NOTIFICATION] pollOrders ERROR:', err);
    } finally {
      isPollingRef.current = false;
    }
  // addNewOrderNotification is defined below but captured via ref — see pollOrdersRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_isRestAdmin, _restaurantUid, playPollSound]);

  // ── Register / unregister OrdersList new-order callbacks ─────────────────────
  const registerNewOrderCallback = useCallback((fn) => {
    newOrderCallbacksRef.current = [...newOrderCallbacksRef.current, fn];
    return () => {
      newOrderCallbacksRef.current = newOrderCallbacksRef.current.filter(f => f !== fn);
    };
  }, []);

  // ── Dismiss global order toast ────────────────────────────────────────────────
  const dismissOrderToast = useCallback((id) => {
    setOrderToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setOrderToasts(prev => prev.filter(t => t.id !== id)), TOAST_EXIT_MS);
  }, []);

  // ── Shared notification handler — socket + restaurant socket ─────────────────
  const handleIncomingNotif = useCallback((notif) => {
    const id   = notif.id ?? notif.notificationId ?? notif.notification_id;
    const type = (notif.type || (notif.data?.type) || '').toUpperCase();

    // Mark socket-delivered order IDs so the poll doesn't duplicate the alert
    if (type === 'NEW_ORDER' || type === 'ORDER_RECEIVED') {
      const orderId = notif.orderId || notif.order_id || notif.data?.orderId;
      if (orderId) notifiedOrderIdsRef.current.add(String(orderId));
    }

    // Always add to notification list regardless of clock skew
    setSocketNotifs(prev => {
      if (id != null && prev.some(n => n.id === id)) {
        console.log(`[NotifDebug] socketNotifs SKIPPED (already exists): id=${id}`);
        return prev;
      }
      return [{ ...notif, _source: 'socket', isRead: false }, ...prev].slice(0, 100);
    });

    // Badge counter for order-related types
    if (ORDER_BADGE_TYPES.has(type)) {
      console.log(`[NotifDebug] INCREMENTING badge: type=${type}`);
      setUnreadOrderCount(prev => prev + 1);
    }

    // Recency check for popup only — list update above is unconditional
    const recent = isRecentNotification(notif);
    if (!recent) {
      const ts  = getNotificationTimestamp(notif);
      const now = Date.now();
      console.log(
        `[NotifDebug] popup SKIPPED (not recent):` +
        ` type=${type}, id=${id}, createdAt=${notif?.createdAt},` +
        ` ts=${ts}, now=${now}, diff=${ts != null ? ts - now : 'null'}ms`
      );
      return;
    }

    console.log(`[NotifDebug] onNewNotification: id=${id}, type=${type}, body="${(notif.body || notif.message || '').slice(0, 60)}"`);

    if (POPUP_TYPES.has(type) || !type) {
      const idStr = id != null ? String(id) : null;
      if (idStr && popupSeenIds.current.has(idStr)) {
        console.log(`[NotifDebug] popup SKIPPED (already in popupSeenIds): id=${idStr}`);
        return;
      }
      if (idStr) popupSeenIds.current.add(idStr);
      setPopupQueue(prev => {
        if (id != null && prev.some(n => n.id === id)) return prev;
        console.log(`[NotifDebug] SETTING popupQueue: type=${type}, id=${id}`);
        return [notif];
      });
    } else {
      console.log(`[NotifDebug] popup SKIPPED (not in POPUP_TYPES): type=${type}`);
    }
  }, []);

  const { notifications, socketConnected, permissionState, acknowledgeNotification } = useAdminNotifications({
    onNewNotification: handleIncomingNotif,
  });

  // Restaurant Admin socket — connects only when the current user is a restaurant admin
  useRestaurantNotifications({
    enabled:       _isRestAdmin,
    restaurantUid: _restaurantUid,
    onNewOrder:    handleIncomingNotif,
  });

  // ── Audio + polling setup (runs once on mount) ───────────────────────────────
  useEffect(() => {
    console.log('[GLOBAL NOTIFICATION] Provider mounted');

    // Audio element for poll-detected alert sounds
    const soundPath = `${import.meta.env.BASE_URL}notification.mp3`;
    pollAudioRef.current = new Audio(soundPath);
    pollAudioRef.current.preload = 'auto';
    pollAudioRef.current.addEventListener('canplaythrough', () => {
      console.log('[SOUND] Audio file loaded (poll path): ' + soundPath);
    }, { once: true });
    pollAudioRef.current.addEventListener('error', (e) => {
      console.log('[SOUND] Audio file load ERROR (poll path): ' + soundPath + ' — ' + (e.message || 'check Network tab for 404'));
    }, { once: true });

    // Unlock audio context on first user interaction (browser autoplay policy)
    const unlockAudio = async () => {
      if (pollAudioUnlocked.current || !pollAudioRef.current) return;
      const prev = pollAudioRef.current.volume;
      try {
        pollAudioRef.current.volume = 0;
        await pollAudioRef.current.play();
        pollAudioRef.current.pause();
        pollAudioRef.current.currentTime = 0;
        pollAudioRef.current.volume = prev;
        pollAudioUnlocked.current = true;
        document.removeEventListener('click',      unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);

        // Play any sound that was queued while audio was locked
        if (pendingPollSound.current) {
          pendingPollSound.current = false;
          const hasLock = await tryAcquireAudioLock();
          if (hasLock) {
            console.log('[SOUND] Audio play started (queued retry, poll path): ' + soundPath);
            pollAudioRef.current.currentTime = 0;
            pollAudioRef.current.play()
              .then(() => console.log('[SOUND] Audio play success (queued retry, poll path)'))
              .catch((e) => console.log('[SOUND] Audio play failed (queued retry, poll path): ' + e));
          }
        }
      } catch {}
    };
    document.addEventListener('click',      unlockAudio, { passive: true });
    document.addEventListener('touchstart', unlockAudio, { passive: true });

    // Poll immediately, then on interval
    pollOrdersRef.current?.();

    const interval = setInterval(() => {
      pollOrdersRef.current?.();
    }, GLOBAL_POLL_INTERVAL);

    // Also poll when the tab regains visibility (catches orders missed while hidden)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') pollOrdersRef.current?.();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('click',      unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep pollOrdersRef pointing at the latest closure (stable across re-renders)
  pollOrdersRef.current = pollOrders;

  // ── Seed notification list from API on initial load ──────────────────────────
  useEffect(() => {
    if (apiSeededRef.current || !notifications?.length) return;
    apiSeededRef.current = true;
    setSocketNotifs(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const fromApi = notifications
        .filter(n => n.id != null && !existingIds.has(n.id))
        .map(n => ({ ...n, _source: 'api', isRead: n.isRead ?? false }));
      return [...fromApi, ...prev].slice(0, 100);
    });
  }, [notifications]);

  const dismissPopup = useCallback((id) => {
    setPopupQueue(prev => prev.filter(n => n.id !== id));
    if (id != null) acknowledgeNotification(id);
  }, [acknowledgeNotification]);

  const resetUnreadOrders = useCallback(() => {
    setUnreadOrderCount(0);
    setNewOrders([]);
    lastResetTime.current = Date.now();
  }, []);

  const addNewOrders = useCallback((orders) => {
    if (!orders?.length) return;
    setNewOrders(prev => {
      const existingIds = new Set(prev.map(o => o.orderId || o.id));
      const uniqueNew   = orders.filter(o => !existingIds.has(o.orderId || o.id));
      return [...uniqueNew, ...prev].slice(0, 50);
    });
    setUnreadOrderCount(prev => prev + orders.length);
  }, []);

  const addNewOrderNotification = useCallback((order) => {
    if (!order) return;
    const recent = isRecentNotification(order);
    if (!recent) {
      const ts  = getNotificationTimestamp(order);
      const now = Date.now();
      console.log(
        `[NotifDebug] addNewOrderNotification SKIPPED (not recent):` +
        ` orderId=${order.orderId || order.id}, time=${order.time || order.createdAt},` +
        ` ts=${ts}, now=${now}, diff=${ts != null ? ts - now : 'null'}ms`
      );
      return;
    }
    console.log(`[NotifDebug] addNewOrderNotification FIRING: orderId=${order.orderId || order.id}`);

    const synId = `syn_${++notifIdCounter.current}_${order.orderId || order.id}`;
    const notif = {
      id:             synId,
      title:          'New Order Received',
      body:           order.restaurant_name
                        ? `${order.restaurant_name} — ₹${order.price}`
                        : `Order #${order.orderId || order.id} — ₹${order.price}`,
      type:           'NEW_ORDER',
      orderId:        order.orderId || order.id,
      customerName:   order.customer_name || order.customer || 'Guest',
      restaurantName: order.restaurant_name || 'Unknown Restaurant',
      amount:         order.price,
      createdAt:      order.time || order.createdAt || new Date().toISOString(),
      isRead:         false,
      _source:        'synthetic',
    };

    setSyntheticNotifs(prev => [notif, ...prev].slice(0, 50));

    // Popup — deduped
    const idStr = String(synId);
    if (!popupSeenIds.current.has(idStr)) {
      popupSeenIds.current.add(idStr);
      setPopupQueue(() => [notif]);
    }
  }, []);

  const markSyntheticNotifRead = useCallback((id) => {
    setSyntheticNotifs(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  const markSocketNotifRead = useCallback((id) => {
    if (id == null) return;
    setSocketNotifs(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  const allMergedNotifications = useMemo(() => {
    const items = [
      ...socketNotifs.map(n => ({ ...n, _source: n._source || 'socket' })),
      ...syntheticNotifs.map(n => ({ ...n, _source: 'synthetic' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const seen = new Set();
    return items.filter(n => {
      if (n.id != null && seen.has(n.id)) return false;
      if (n.id != null) seen.add(n.id);
      return true;
    });
  }, [socketNotifs, syntheticNotifs]);

  return (
    <OrderNotificationContext.Provider
      value={{
        unreadOrderCount,
        newOrders,
        syntheticNotifs,
        socketNotifs,
        socketConnected,
        permissionState,
        allMergedNotifications,
        popupQueue,
        // Global new-order toasts (rendered in Layout)
        orderToasts,
        dismissOrderToast,
        // Callback registration for OrdersList table refresh
        registerNewOrderCallback,
        dismissPopup,
        acknowledgeNotification,
        resetUnreadOrders,
        addNewOrders,
        addNewOrderNotification,
        markSyntheticNotifRead,
        markSocketNotifRead,
        lastResetTime,
      }}
    >
      {children}
    </OrderNotificationContext.Provider>
  );
};

export const useOrderNotifications = () => {
  const ctx = useContext(OrderNotificationContext);
  if (!ctx) {
    return {
      unreadOrderCount:        0,
      newOrders:               [],
      syntheticNotifs:         [],
      socketNotifs:            [],
      socketConnected:         false,
      permissionState:         'default',
      allMergedNotifications:  [],
      popupQueue:              [],
      orderToasts:             [],
      dismissOrderToast:       () => {},
      registerNewOrderCallback:() => () => {},
      dismissPopup:            () => {},
      acknowledgeNotification: () => {},
      resetUnreadOrders:       () => {},
      addNewOrders:            () => {},
      addNewOrderNotification: () => {},
      markSyntheticNotifRead:  () => {},
      markSocketNotifRead:     () => {},
      lastResetTime:           { current: Date.now() },
    };
  }
  return ctx;
};

export default OrderNotificationContext;
