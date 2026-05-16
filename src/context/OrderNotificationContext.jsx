import { createContext, useContext, useState, useCallback, useRef } from "react";

const OrderNotificationContext = createContext(null);

export const OrderNotificationProvider = ({ children }) => {
  const [unreadOrderCount, setUnreadOrderCount] = useState(0);
  const [newOrders, setNewOrders] = useState([]);
  const [syntheticNotifs, setSyntheticNotifs] = useState([]);
  const lastResetTime = useRef(Date.now());
  const notifIdCounter = useRef(0);

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
  }, []);

  const markSyntheticNotifRead = useCallback((id) => {
    setSyntheticNotifs(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  return (
    <OrderNotificationContext.Provider
      value={{
        unreadOrderCount,
        newOrders,
        syntheticNotifs,
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
