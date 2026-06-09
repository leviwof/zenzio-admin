import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from "react";
import useAdminNotifications from "../hooks/useAdminNotifications";
import { isRecentNotification, getNotificationTimestamp } from "../utils/notifications";

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

export const OrderNotificationProvider = ({ children }) => {
  const [unreadOrderCount, setUnreadOrderCount] = useState(0);
  const [newOrders,        setNewOrders]         = useState([]);
  const [syntheticNotifs,  setSyntheticNotifs]   = useState([]);
  const [socketNotifs,     setSocketNotifs]       = useState([]);
  const [popupQueue,       setPopupQueue]         = useState([]);

  const lastResetTime    = useRef(Date.now());
  const notifIdCounter   = useRef(0);
  // Track which IDs have already been added to popupQueue this session
  const popupSeenIds     = useRef(new Set());

  const apiSeededRef = useRef(false);

  const { notifications, socketConnected, permissionState, acknowledgeNotification } = useAdminNotifications({
    onNewNotification: (notif) => {
      const id   = notif.id ?? notif.notificationId ?? notif.notification_id;
      const type = (notif.type || '').toUpperCase();

      // Always add to notification list regardless of clock skew — so it appears in the dropdown
      setSocketNotifs(prev => {
        if (id != null && prev.some(n => n.id === id)) {
          console.log(`[NotifDebug] OrderNotificationContext socketNotifs SKIPPED (already exists): id=${id}`);
          return prev;
        }
        return [{ ...notif, _source: 'socket', isRead: false }, ...prev].slice(0, 100);
      });

      // Badge counter for order-related types
      if (ORDER_BADGE_TYPES.has(type)) {
        console.log(`[NotifDebug] OrderNotificationContext INCREMENTING badge: type=${type}`);
        setUnreadOrderCount(prev => prev + 1);
      }

      // Recency check for popup — prevents old reconnect-recovered notifications from showing popups.
      // Diagnose with exact timestamps if blocked.
      const recent = isRecentNotification(notif);
      if (!recent) {
        const ts  = getNotificationTimestamp(notif);
        const now = Date.now();
        console.log(
          `[NotifDebug] OrderNotificationContext.onNewNotification popup SKIPPED (not recent):` +
          ` type=${type}, id=${id}, createdAt=${notif?.createdAt},` +
          ` ts=${ts}, now=${now}, diff=${ts != null ? ts - now : 'null'}ms`
        );
        return;
      }

      console.log(`[NotifDebug] OrderNotificationContext.onNewNotification: id=${id}, type=${type}, body="${(notif.body || notif.message || '').slice(0, 60)}"`);

      // In-app popup toast — only for relevant types, only once per ID
      if (POPUP_TYPES.has(type) || !type) {
        const idStr = id != null ? String(id) : null;
        if (idStr && popupSeenIds.current.has(idStr)) {
          console.log(`[NotifDebug] OrderNotificationContext popup SKIPPED (already in popupSeenIds): id=${idStr}`);
          return;
        }
        if (idStr) popupSeenIds.current.add(idStr);

        setPopupQueue(prev => {
          if (id != null && prev.some(n => n.id === id)) return prev;
          console.log(`[NotifDebug] OrderNotificationContext SETTING popupQueue: type=${type}, id=${id}`);
          return [notif];
        });
      } else {
        console.log(`[NotifDebug] OrderNotificationContext popup SKIPPED (not in POPUP_TYPES): type=${type}`);
      }
    },
  });

  // Seed notification list from API on initial load so the bell is never empty
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
    // Stop sound escalation for this notification
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
    if (!isRecentNotification(order)) return;

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
      setPopupQueue(() => [notif]); // replace queue — one popup at a time
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
      // session-scoped socket/synthetic notifs are always relevant — no time filter here
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
      unreadOrderCount:       0,
      newOrders:              [],
      syntheticNotifs:        [],
      socketNotifs:           [],
      socketConnected:        false,
      permissionState:        'default',
      allMergedNotifications: [],
      popupQueue:             [],
      dismissPopup:            () => {},
      acknowledgeNotification: () => {},
      resetUnreadOrders:       () => {},
      addNewOrders:           () => {},
      addNewOrderNotification:() => {},
      markSyntheticNotifRead: () => {},
      markSocketNotifRead:    () => {},
      lastResetTime:          { current: Date.now() },
    };
  }
  return ctx;
};

export default OrderNotificationContext;
