import { useEffect, useRef, useCallback, useState } from 'react';
import { getAdminSocket, onAdminReconnect, isAdminSocketConnected } from '../services/socket';
import { getNotifications } from '../services/api';

const SOUND_TYPES = new Set([
  'NEW_ORDER',
  'ORDER_CANCELLED',
  'DELIVERY_CANCELLED',
  'CANCELLED',
  'ORDER_ASSIGNED',
  'DELIVERY_ASSIGNED',
  'DELIVERY_ISSUE',
  'PAYMENT_FAILURE',
  'RESTAURANT_ESCALATION',
  'NEW_DELIVERY',
  'PARTNER_ACCEPTED',
  'ORDER_REASSIGNED',
  'ORDER_PICKED_UP',
  'STATUS_CHANGED',
]);

const FALLBACK_POLL_INTERVAL = 35000;
const RECONNECT_FETCH_DELAY = 2000;

function claimSoundForTab(notificationId) {
  if (!notificationId) return false;
  const key = `ntf_sound_${notificationId}`;
  const existing = localStorage.getItem(key);
  if (existing) return false;
  localStorage.setItem(key, Date.now().toString());
  return true;
}

function cleanupSoundClaims() {
  const now = Date.now();
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('ntf_sound_')) {
      const value = localStorage.getItem(key);
      if (value && now - Number(value) > 60000) {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export default function useAdminNotifications({
  onNotification,
  onSoundTrigger,
  onNewNotification,
} = {}) {
  const [socketConnected, setSocketConnected] = useState(false);
  const lastPlayedIdRef = useRef(null);
  const localNotifsRef = useRef([]);
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const notificationTypesRef = useRef(new Set());
  const bcRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const [notifications, setNotifications] = useState([]);

  const playSound = useCallback(() => {
    if (!audioRef.current || !audioUnlockedRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const showBrowserNotification = useCallback((notif) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (notif.title && notif.message) {
      try {
        const n = new Notification(notif.title, {
          body: notif.message,
          icon: `${import.meta.env.BASE_URL}logo.png`,
          tag: `admin-notif-${notif.id}`,
          silent: true,
        });
        n.onclick = () => {
          window.focus();
          if (notif.data?.orderId) {
            window.location.href = `/orders/${notif.data.orderId}`;
          }
          n.close();
        };
      } catch {}
    }
  }, []);

  const handleNewNotification = useCallback(
    (notif) => {
      if (!mountedRef.current) return;
      const notifType = notif.type || 'GENERAL';

      localNotifsRef.current = [notif, ...localNotifsRef.current].slice(0, 100);
      setNotifications([...localNotifsRef.current]);

      if (onNotification) onNotification(notif);
      if (onNewNotification) onNewNotification(notif);

      const shouldPlaySound = SOUND_TYPES.has(notifType);
      const isDuplicate = notif.id === lastPlayedIdRef.current;

      if (shouldPlaySound && !isDuplicate && claimSoundForTab(notif.id)) {
        lastPlayedIdRef.current = notif.id;
        playSound();
        if (onSoundTrigger) onSoundTrigger(notif);
      }

      showBrowserNotification(notif);
    },
    [onNotification, onSoundTrigger, onNewNotification, playSound, showBrowserNotification],
  );

  const fetchMissedNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      let docs = [];
      if (Array.isArray(response.data?.data)) docs = response.data.data;
      else if (Array.isArray(response.data?.notifications)) docs = response.data.notifications;
      else if (Array.isArray(response.data)) docs = response.data;
      const existingIds = new Set(localNotifsRef.current.map((n) => n.id));
      const missed = docs.filter((n) => !existingIds.has(n.id));
      if (missed.length > 0) {
        localNotifsRef.current = [...missed, ...localNotifsRef.current].slice(0, 100);
        setNotifications([...localNotifsRef.current]);
        missed.forEach((n) => {
          if (onNewNotification) onNewNotification(n);
        });
        const anySoundWorthy = missed.some((n) =>
          SOUND_TYPES.has((n.data?.type) || 'GENERAL'),
        );
        if (anySoundWorthy && mountedRef.current) {
          cleanupSoundClaims();
        }
      }
    } catch {}
  }, [onNewNotification]);

  const fetchNotificationsFallback = useCallback(async () => {
    if (isAdminSocketConnected()) return;
    await fetchMissedNotifications();
  }, [fetchMissedNotifications]);

  useEffect(() => {
    const soundPath = `${import.meta.env.BASE_URL}notification.mp3`;
    audioRef.current = new Audio(soundPath);
    audioRef.current.preload = 'auto';

    const unlock = () => {
      if (!audioUnlockedRef.current) {
        audioRef.current
          .play()
          .then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioUnlockedRef.current = true;
          })
          .catch(() => {});
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    try {
      bcRef.current = new BroadcastChannel('admin_notifications');
      bcRef.current.onmessage = (event) => {
        if (event.data?.type === 'new_notif') {
          const notif = event.data.notification;
          if (notif && notif.id !== lastPlayedIdRef.current) {
            localNotifsRef.current = [notif, ...localNotifsRef.current].slice(0, 100);
            setNotifications([...localNotifsRef.current]);
            if (onNewNotification) onNewNotification(notif);
          }
        }
      };
    } catch {}

    const unsubReconnect = onAdminReconnect(() => {
      setTimeout(() => {
        fetchMissedNotifications();
      }, RECONNECT_FETCH_DELAY);
    });

    return () => {
      mountedRef.current = false;
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      unsubReconnect();
      if (bcRef.current) {
        bcRef.current.close();
      }
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
      }
    };
  }, [fetchMissedNotifications, onNewNotification]);

  const connectSocket = useCallback(() => {
    const socket = getAdminSocket();
    if (!socket) return;

    if (socket.connected) {
      setSocketConnected(true);
    }

    socket.on('connect', () => {
      if (mountedRef.current) setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      if (mountedRef.current) setSocketConnected(false);
    });

    socket.on('new_notification', (notif) => {
      handleNewNotification(notif);
      try {
        if (bcRef.current) {
          bcRef.current.postMessage({ type: 'new_notif', notification: notif });
        }
      } catch {}
    });
  }, [handleNewNotification]);

  useEffect(() => {
    connectSocket();
    const socket = getAdminSocket();

    fallbackTimerRef.current = setInterval(() => {
      fetchNotificationsFallback();
    }, FALLBACK_POLL_INTERVAL);

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('new_notification');
      }
    };
  }, [connectSocket, fetchNotificationsFallback]);

  return {
    notifications,
    socketConnected,
    playSound,
  };
}
