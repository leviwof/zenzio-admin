import { useEffect, useRef, useCallback, useState } from 'react';
import { getAdminSocket, onAdminReconnect, isAdminSocketConnected } from '../services/socket';
import { getNotifications } from '../services/api';
import {
  buildDesktopNotificationContent,
  claimNotificationAlert,
  getNotificationId,
  getStoredLastNotificationId,
  getStoredLastNotificationTime,
  isImportantAdminNotification,
  isNotificationNewer,
  rememberLastNotification,
  requestDesktopNotificationPermissionOnce,
  showDesktopNotification,
} from '../services/desktopNotificationService';

const FALLBACK_POLL_INTERVAL = 35000;
const RECONNECT_FETCH_DELAY = 2000;

function getNotificationTime(notification = {}) {
  const time = Date.parse(notification.createdAt || notification.created_at || notification.timestamp || '');
  return Number.isFinite(time) ? time : 0;
}

function compareNotifications(a = {}, b = {}) {
  const aId = Number(getNotificationId(a));
  const bId = Number(getNotificationId(b));
  if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) {
    return aId - bId;
  }
  return getNotificationTime(a) - getNotificationTime(b);
}

function getLatestNotification(docs = []) {
  const sorted = [...docs].sort(compareNotifications);
  return sorted[sorted.length - 1];
}

export default function useAdminNotifications({
  onNotification,
  onSoundTrigger,
  onNewNotification,
} = {}) {
  const [socketConnected, setSocketConnected] = useState(false);
  const initializedRef = useRef(false);
  const lastNotificationIdRef = useRef(getStoredLastNotificationId());
  const lastNotificationTimeRef = useRef(getStoredLastNotificationTime());
  const localNotifsRef = useRef([]);
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const bcRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const [notifications, setNotifications] = useState([]);

  const playSound = useCallback(() => {
    if (!audioRef.current || !audioUnlockedRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {
      // Audio failures should never block notification state updates.
    }
  }, []);

  const handleNewNotification = useCallback(
    (notif, { alert = true } = {}) => {
      if (!mountedRef.current) return;
      const notificationId = getNotificationId(notif);
      const alreadyLoaded = notificationId
        ? localNotifsRef.current.some((item) => String(getNotificationId(item)) === String(notificationId))
        : false;
      if (alreadyLoaded) return;

      localNotifsRef.current = [notif, ...localNotifsRef.current].slice(0, 100);
      setNotifications([...localNotifsRef.current]);

      if (onNotification) onNotification(notif);
      if (onNewNotification) onNewNotification(notif);

      if (alert && isImportantAdminNotification(notif) && claimNotificationAlert(notif)) {
        const { title, message } = buildDesktopNotificationContent(notif);
        playSound();
        if (onSoundTrigger) onSoundTrigger(notif);
        showDesktopNotification(title, message, {
          notification: notif,
          notificationId,
          type: notif.type,
        });
      }

      rememberLastNotification(notif);
      lastNotificationIdRef.current = getStoredLastNotificationId();
      lastNotificationTimeRef.current = getStoredLastNotificationTime();
    },
    [onNotification, onSoundTrigger, onNewNotification, playSound],
  );

  const fetchMissedNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      let docs = [];
      if (Array.isArray(response.data?.data)) docs = response.data.data;
      else if (Array.isArray(response.data?.notifications)) docs = response.data.notifications;
      else if (Array.isArray(response.data)) docs = response.data;
      const docsList = Array.isArray(docs) ? docs : [];
      if (!initializedRef.current) {
        localNotifsRef.current = docsList.slice(0, 100);
        setNotifications([...localNotifsRef.current]);
        const latest = getLatestNotification(docsList);
        if (latest) {
          rememberLastNotification(latest);
          lastNotificationIdRef.current = getStoredLastNotificationId();
          lastNotificationTimeRef.current = getStoredLastNotificationTime();
        }
        initializedRef.current = true;
        return;
      }

      const existingIds = new Set(localNotifsRef.current.map((n) => String(getNotificationId(n))));
      const missed = docsList.filter((n) => {
        const id = getNotificationId(n);
        if (id === null || id === undefined || existingIds.has(String(id))) return false;
        return isNotificationNewer(n, lastNotificationIdRef.current, lastNotificationTimeRef.current);
      });

      if (missed.length > 0) {
        [...missed].sort(compareNotifications).forEach((n) => handleNewNotification(n, { alert: true }));
      }
    } catch {
      // Polling errors are non-fatal; the next interval or socket event can recover.
    }
  }, [handleNewNotification]);

  const fetchNotificationsFallback = useCallback(async () => {
    if (isAdminSocketConnected()) return;
    await fetchMissedNotifications();
  }, [fetchMissedNotifications]);

  useEffect(() => {
    const soundPath = `${import.meta.env.BASE_URL}notification.mp3`;
    audioRef.current = new Audio(soundPath);
    audioRef.current.preload = 'auto';

    const unlock = () => {
      requestDesktopNotificationPermissionOnce({ fromUserGesture: true }).catch(() => {});
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

    requestDesktopNotificationPermissionOnce().catch(() => {});

    try {
      bcRef.current = new BroadcastChannel('admin_notifications');
      bcRef.current.onmessage = (event) => {
        if (event.data?.type === 'new_notif') {
          const notif = event.data.notification;
          if (notif) {
            const notificationId = getNotificationId(notif);
            const alreadyLoaded = notificationId
              ? localNotifsRef.current.some((item) => String(getNotificationId(item)) === String(notificationId))
              : false;
            if (alreadyLoaded) return;
            localNotifsRef.current = [notif, ...localNotifsRef.current].slice(0, 100);
            setNotifications([...localNotifsRef.current]);
            if (onNewNotification) onNewNotification(notif);
            rememberLastNotification(notif);
            lastNotificationIdRef.current = getStoredLastNotificationId();
            lastNotificationTimeRef.current = getStoredLastNotificationTime();
          }
        }
      };
    } catch {
      // BroadcastChannel is optional and may be unavailable in some browsers.
    }

    fetchMissedNotifications();

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
      } catch {
        // Cross-tab sync is best-effort.
      }
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
