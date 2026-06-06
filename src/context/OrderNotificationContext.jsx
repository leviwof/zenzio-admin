import { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";
import useAdminNotifications from "../hooks/useAdminNotifications";

const OrderNotificationContext = createContext(null);

// Types that bump the order badge counter
const ORDER_BADGE_TYPES = new Set(['NEW_ORDER', 'ORDER_RECEIVED', 'ORDER_CANCELLED', 'ORDER_CANCELED', 'CANCELLED']);

export const OrderNotificationProvider = ({ children }) => {
  const [unreadOrderCount, setUnreadOrderCount] = useState(0);
  const [newOrders, setNewOrders] = useState([]);
  const [syntheticNotifs, setSyntheticNotifs] = useState([]);
  const [socketNotifs, setSocketNotifs] = useState([]);
  const [popupQueue, setPopupQueue] = useState([]); // in-app popup notifications
  const lastResetTime = useRef(Date.now());
  const notifIdCounter = useRef(0);

  const { socketConnected } = useAdminNotifications({
    onNewNotification: (notif) => {
      setSocketNotifs(prev => {
        const exists = prev.some(n => n.id === notif.id);
        if (exists) return prev;
        return [{ ...notif, _source: 'socket', isRead: false }, ...prev].slice(0, 100);
      });
      if (ORDER_BADGE_TYPES.has(notif.type)) {
        setUnreadOrderCount(prev => prev + 1);
      }
      // Replace popup queue with only the latest notification (one popup at a time)
      setPopupQueue(prev => {
        const exists = prev.some(n => n.id === notif.id);
        if (exists) return prev;
        return [notif]; // replace — never stack
      });
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
    if (!orders || orders.length === 0) return;
    setNewOrders(prev => {
      const existingIds = new Set(prev.map(o => o.orderId || o.id));
      const uniqueNew = orders.filter(o => !existingIds.has(o.orderId || o.id));
      return [...uniqueNew, ...prev].slice(0, 50);
    });
    setUnreadOrderCount(prev => prev + orders.length);
  }, []);

  const addNewOrderNotification = useCallback((order) => {
    if (!order) return;
    const id = `syn_new_${++notifIdCounter.current}_${order.orderId || order.id}`;
    const notif = {
      id,
      title: "New Order Received",
      body: order.restaurant_name
        ? `${order.restaurant_name} - ₹${order.price}`
        : `Order #${order.orderId || order.id} - ₹${order.price}`,
      type: "NEW_ORDER",
      orderId: order.orderId || order.id,
      customerName: order.customer_name || order.customer || "Guest",
      restaurantName: order.restaurant_name || "Unknown Restaurant",
      amount: order.price,
      createdAt: order.time || order.createdAt || new Date().toISOString(),
      isRead: false,
      _source: "synthetic",
    };
    setSyntheticNotifs(prev => [notif, ...prev].slice(0, 50));
    // Replace popup queue with only the latest notification (one popup at a time)
    setPopupQueue(prev => {
      const exists = prev.some(n => n.id === notif.id);
      if (exists) return prev;
      return [notif];
    });
  }, []);

  const markSyntheticNotifRead = useCallback((id) => {
    setSyntheticNotifs(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  const allMergedNotifications = useMemo(() => {
    const socketItems = socketNotifs.map(n => ({ ...n, _source: n._source || 'socket' }));
    const syntheticItems = syntheticNotifs.map(n => ({ ...n, _source: 'synthetic' }));
    const combined = [...socketItems, ...syntheticItems].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    const seen = new Set();
    return combined.filter(n => {
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
      unreadOrderCount: 0,
      newOrders: [],
      syntheticNotifs: [],
      socketNotifs: [],
      socketConnected: false,
      allMergedNotifications: [],
      popupQueue: [],
      dismissPopup: () => {},
      resetUnreadOrders: () => {},
      addNewOrders: () => {},
      addNewOrderNotification: () => {},
      markSyntheticNotifRead: () => {},
      lastResetTime: { current: Date.now() },
    };
  }
  return ctx;
};

export default OrderNotificationContext;
