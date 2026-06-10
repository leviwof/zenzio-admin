import { useEffect, useRef, useCallback, useState } from 'react';
import {
  getRestaurantAdminSocket,
  disconnectRestaurantAdminSocket,
} from '../services/socket';

const SOUND_SRC = `${import.meta.env.BASE_URL}notification.mp3`;

export default function useRestaurantNotifications({ enabled, restaurantUid, onNewOrder }) {
  const [connected, setConnected] = useState(false);
  const processedIds = useRef(new Set());
  const audioRef     = useRef(null);
  const onNewOrderRef = useRef(onNewOrder);
  useEffect(() => { onNewOrderRef.current = onNewOrder; }, [onNewOrder]);

  // Initialise audio element once
  useEffect(() => {
    if (!enabled) return;
    const audio = new Audio(SOUND_SRC);
    audio.preload = 'auto';
    audioRef.current = audio;

    // Prime the audio context on first user interaction so autoplay works
    const prime = () => {
      if (!audioRef.current) return;
      const prev = audioRef.current.volume;
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.volume = prev;
      }).catch(() => {});
    };
    document.addEventListener('click', prime, { once: true });
    document.addEventListener('touchstart', prime, { once: true });

    return () => {
      document.removeEventListener('click', prime);
      document.removeEventListener('touchstart', prime);
      audioRef.current = null;
    };
  }, [enabled]);

  const playSound = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play()
      .then(() => console.log('[RestaurantNotif] Sound Played'))
      .catch((err) => console.log('[RestaurantNotif] Sound Failed: ' + err.message));
  }, []);

  const showDesktopNotification = useCallback((notif) => {
    if (!('Notification' in window)) {
      console.log('[RestaurantNotif] Desktop Notification SKIPPED: API not supported');
      return;
    }
    if (Notification.permission !== 'granted') {
      console.log('[RestaurantNotif] Desktop Notification SKIPPED: permission=' + Notification.permission);
      return;
    }
    const data      = notif.data || {};
    const orderId   = data.orderId   || notif.orderId   || notif.id || '';
    const customer  = data.customerName  || notif.customerName  || notif.message || 'Customer';
    const amount    = data.amount || '';
    const body = [
      'Order #' + orderId,
      'Customer: ' + customer,
      amount ? 'Amount: ₹' + amount : '',
    ].filter(Boolean).join('\n');

    try {
      const n = new Notification('New Order Received', {
        body,
        requireInteraction: true,
        tag: 'restaurant-order-' + orderId,
      });
      n.onclick = () => { window.focus(); n.close(); };
      console.log('[RestaurantNotif] Desktop Notification Fired: orderId=' + orderId);
    } catch (err) {
      console.log('[RestaurantNotif] Desktop Notification SKIPPED: error=' + err.message);
    }
  }, []);

  // Request browser notification permission once on mount
  useEffect(() => {
    if (!enabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        console.log('[RestaurantNotif] Notification permission: ' + p);
      });
    }
  }, [enabled]);

  // Connect socket and attach event listeners
  useEffect(() => {
    if (!enabled || !restaurantUid) return;

    const socket = getRestaurantAdminSocket(restaurantUid);
    if (!socket) return;

    const handleOrderEvent = (rawNotif) => {
      console.log('[RestaurantNotif] Order Event Received', rawNotif);

      // Dedup by notification ID
      const id = rawNotif.id || rawNotif.notificationId || rawNotif.notification_id;
      const idStr = id != null ? String(id) : null;
      if (idStr && processedIds.current.has(idStr)) {
        console.log('[RestaurantNotif] SKIPPED duplicate id=' + idStr);
        return;
      }
      if (idStr) processedIds.current.add(idStr);

      playSound();
      showDesktopNotification(rawNotif);

      if (onNewOrderRef.current) {
        onNewOrderRef.current(rawNotif);
      }
    };

    const onConnect    = () => { console.log('[RestaurantNotif] Socket Connected'); setConnected(true); };
    const onDisconnect = () => { setConnected(false); };

    if (socket.connected) {
      console.log('[RestaurantNotif] Socket Connected (already connected)');
      setConnected(true);
    }

    socket.on('connect',          onConnect);
    socket.on('disconnect',       onDisconnect);
    socket.on('order:new',        handleOrderEvent);
    socket.on('new_notification', handleOrderEvent);
    socket.on('notification:new', handleOrderEvent);

    return () => {
      socket.off('connect',          onConnect);
      socket.off('disconnect',       onDisconnect);
      socket.off('order:new',        handleOrderEvent);
      socket.off('new_notification', handleOrderEvent);
      socket.off('notification:new', handleOrderEvent);
    };
  }, [enabled, restaurantUid, playSound, showDesktopNotification]);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      if (enabled) disconnectRestaurantAdminSocket();
    };
  }, [enabled]);

  return { connected };
}
