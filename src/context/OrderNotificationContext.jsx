import { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";
import useAdminNotifications from "../hooks/useAdminNotifications";

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

  const { socketConnected, permissionState } = useAdminNotifications({
    onNewNotification: (notif) => {
      const id   = notif.id ?? notif.notificationId ?? notif.notification_id;
      const type = (notif.type || '').toUpperCase();

      // Update socket notification list
      setSocketNotifs(prev => {
        if (prev.some(n => n.id === id)) return prev;
        return [{ ...notif, _source: 'socket', isRead: false }, ...prev].slice(0, 100);
      });

      // Badge counter for order-related types
      if (ORDER_BADGE_TYPES.has(type)) {
        setUnreadOrderCount(prev => prev + 1);
      }

      // In-app popup toast — only for relevant types, only once per ID
      if (POPUP_TYPES.has(type) || !type) {
        const idStr = id != null ? String(id) : null;
        if (idStr && popupSeenIds.current.has(idStr)) return;
        if (idStr) popupSeenIds.current.add(idStr);

        setPopupQueue(prev => {
          if (id != null && prev.some(n => n.id === id)) return prev;
          // Replace queue with only the latest notification (one popup at a time)
          return [notif];
        });
      }
    },
  });

  const dismissPopup = useCallback((id) => {
    setPopupQueue(prev => prev.filter(n => n.id !== id));
  }, []);

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

  const allMergedNotifications = useMemo(() => {
    const items = [
      ...socketNotifs.map(n => ({ ...n, _source: n._source || 'socket' })),
      ...syntheticNotifs.map(n => ({ ...n, _source: 'synthetic' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const seen = new Set();
    return items.filter(n => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
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
        resetUnreadOrders,
        addNewOrders,
        addNewOrderNotification,
        markSyntheticNotifRead,
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
      dismissPopup:           () => {},
      resetUnreadOrders:      () => {},
      addNewOrders:           () => {},
      addNewOrderNotification:() => {},
      markSyntheticNotifRead: () => {},
      lastResetTime:          { current: Date.now() },
    };
  }
  return ctx;
};

export default OrderNotificationContext;
