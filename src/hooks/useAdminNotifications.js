import { useEffect, useRef, useCallback, useState } from 'react';
import { getAdminSocket, onAdminReconnect, isAdminSocketConnected } from '../services/socket';
import { getNotifications } from '../services/api';
import {
  buildDesktopNotificationContent,
  claimNotificationAlert,
  getNotificationId,
  getStoredLastNotificationId,
  getStoredLastNotificationTime,
  hasSoundPlayed,
  isImportantAdminNotification,
  isNotificationNewer,
  markSoundPlayed,
  rememberLastNotification,
  requestDesktopNotificationPermissionOnce,
  showDesktopNotification,
} from '../services/desktopNotificationService';

const FALLBACK_POLL_INTERVAL  = 35000;
const RECONNECT_FETCH_DELAY   = 2000;

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function getNotificationTime(notification = {}) {
  const time = Date.parse(
    notification.createdAt || notification.created_at || notification.timestamp || '',
  );
  return Number.isFinite(time) ? time : 0;
}

function compareNotifications(a = {}, b = {}) {
  const aId = Number(getNotificationId(a));
  const bId = Number(getNotificationId(b));
  if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return aId - bId;
  return getNotificationTime(a) - getNotificationTime(b);
}

function getLatestNotification(docs = []) {
  const sorted = [...docs].sort(compareNotifications);
  return sorted[sorted.length - 1];
}

// ─── normalize raw socket/API payload ────────────────────────────────────────
// Backend socket sends { message, type } but entity uses { body, type }.
function normalizeNotif(raw = {}) {
  if (!raw) return raw;
  return raw.message !== undefined && !raw.body
    ? { ...raw, body: raw.message, type: raw.type || raw.data?.type || 'GENERAL' }
    : { ...raw, type: raw.type || raw.data?.type || 'GENERAL' };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function useAdminNotifications({
  onNotification,
  onSoundTrigger,
  onNewNotification,
} = {}) {
  const [socketConnected, setSocketConnected]   = useState(false);
  const initializedRef         = useRef(false);
  const lastNotificationIdRef  = useRef(getStoredLastNotificationId());
  const lastNotificationTimeRef= useRef(getStoredLastNotificationTime());
  const localNotifsRef         = useRef([]);
  const audioRef               = useRef(null);
  const audioUnlockedRef       = useRef(false);
  const bcRef                  = useRef(null);
  const fallbackTimerRef       = useRef(null);
  const mountedRef             = useRef(true);
  const socketHandlersRef      = useRef(null);
  const [notifications, setNotifications] = useState([]);

  // ─── Sound ─────────────────────────────────────────────────────────────────
  /**
   * Play notification.mp3 once per unique notification ID.
   *
   * @param {string|number|null} notifId - notification.id for dedup.
   *   Pass null to always play (synthetic notifications with no persistent ID).
   */
  const playSound = useCallback((notifId = null) => {
    if (!audioRef.current || !audioUnlockedRef.current) return;

    // ID-based dedup: don't replay sound for the same notification after refresh
    if (notifId !== null && notifId !== undefined) {
      if (hasSoundPlayed(notifId)) return;
      markSoundPlayed(notifId);
    }

    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {
      // Audio failures must never block notification state updates.
    }
  }, []);

  // ─── Core notification handler ────────────────────────────────────────────
  const handleNewNotification = useCallback(
    (rawNotif, { alert = true } = {}) => {
      if (!mountedRef.current) return;

      const notif = normalizeNotif(rawNotif);
      const notificationId = getNotificationId(notif);

      // In-memory dedup (prevents same notification processed twice in same session)
      const alreadyLoaded = notificationId
        ? localNotifsRef.current.some(
            (item) => String(getNotificationId(item)) === String(notificationId),
          )
        : false;
      if (alreadyLoaded) return;

      localNotifsRef.current = [notif, ...localNotifsRef.current].slice(0, 100);
      setNotifications([...localNotifsRef.current]);

      if (onNotification)    onNotification(notif);
      if (onNewNotification) onNewNotification(notif);

      // Alert (sound + desktop popup) — only once per notification ID
      if (alert && isImportantAdminNotification(notif) && claimNotificationAlert(notif)) {
        const { title, message } = buildDesktopNotificationContent(notif);

        // Sound — deduped by notification ID
        playSound(notificationId);
        if (onSoundTrigger) onSoundTrigger(notif);

        // Native OS desktop notification (Windows Notification Center)
        showDesktopNotification(title, message, {
          notification:   notif,
          notificationId,
          type:           notif.type,
        });
      }

      rememberLastNotification(notif);
      lastNotificationIdRef.current  = getStoredLastNotificationId();
      lastNotificationTimeRef.current= getStoredLastNotificationTime();
    },
    [onNotification, onSoundTrigger, onNewNotification, playSound],
  );

  // ─── Polling / missed-notification fetch ──────────────────────────────────
  const fetchMissedNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      let docs = [];
      if (Array.isArray(response.data?.data))          docs = response.data.data;
      else if (Array.isArray(response.data?.notifications)) docs = response.data.notifications;
      else if (Array.isArray(response.data))           docs = response.data;

      const docsList = Array.isArray(docs) ? docs : [];

      if (!initializedRef.current) {
        // First load: seed local list, record last-seen notification, don't alert
        localNotifsRef.current = docsList.slice(0, 100);
        setNotifications([...localNotifsRef.current]);
        const latest = getLatestNotification(docsList);
        if (latest) {
          rememberLastNotification(latest);
          lastNotificationIdRef.current  = getStoredLastNotificationId();
          lastNotificationTimeRef.current= getStoredLastNotificationTime();
        }
        initializedRef.current = true;
        return;
      }

      // Subsequent polls: only surface notifications newer than last-seen
      const existingIds = new Set(
        localNotifsRef.current.map((n) => String(getNotificationId(n))),
      );
      const missed = docsList.filter((n) => {
        const id = getNotificationId(n);
        if (id === null || id === undefined || existingIds.has(String(id))) return false;
        return isNotificationNewer(n, lastNotificationIdRef.current, lastNotificationTimeRef.current);
      });

      if (missed.length > 0) {
        [...missed].sort(compareNotifications).forEach((n) =>
          handleNewNotification(n, { alert: true }),
        );
      }
    } catch {
      // Polling errors are non-fatal; next interval or socket event will recover.
    }
  }, [handleNewNotification]);

  // Only poll when socket is disconnected (WebSocket = primary, polling = fallback)
  const fetchNotificationsFallback = useCallback(async () => {
    if (isAdminSocketConnected()) return;
    await fetchMissedNotifications();
  }, [fetchMissedNotifications]);

  // ─── Setup: audio, BroadcastChannel, permission, initial fetch ────────────
  useEffect(() => {
    mountedRef.current = true;

    // ── Audio setup ──────────────────────────────────────────────────────────
    const soundPath = `${import.meta.env.BASE_URL}notification.mp3`;
    audioRef.current = new Audio(soundPath);
    audioRef.current.preload = 'auto';

    const unlockAudioAndPermission = () => {
      // Request notification permission inside user-gesture context
      requestDesktopNotificationPermissionOnce({ fromUserGesture: true }).catch(() => {});

      // Unlock audio autoplay (browser policy requires a gesture)
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

    document.addEventListener('click',      unlockAudioAndPermission);
    document.addEventListener('touchstart', unlockAudioAndPermission);

    // Passive request (will be a no-op if permission already decided)
    requestDesktopNotificationPermissionOnce().catch(() => {});

    // ── BroadcastChannel — cross-tab sync ────────────────────────────────────
    // When multiple admin tabs are open, only the receiving tab fires the
    // socket listener; BroadcastChannel propagates to other tabs so they also
    // update their notification list (but don't double-play sound/show popups).
    try {
      bcRef.current = new BroadcastChannel('admin_notifications');
      bcRef.current.onmessage = (event) => {
        if (event.data?.type !== 'new_notif') return;
        const rawNotif = event.data.notification;
        if (!rawNotif) return;

        const notif = normalizeNotif(rawNotif);
        const notificationId = getNotificationId(notif);

        const alreadyLoaded = notificationId
          ? localNotifsRef.current.some(
              (item) => String(getNotificationId(item)) === String(notificationId),
            )
          : false;
        if (alreadyLoaded) return;

        // Cross-tab: update list state only — sound/desktop already fired in
        // the original tab that received the socket event.
        localNotifsRef.current = [notif, ...localNotifsRef.current].slice(0, 100);
        setNotifications([...localNotifsRef.current]);
        if (onNewNotification) onNewNotification(notif);
        rememberLastNotification(notif);
        lastNotificationIdRef.current  = getStoredLastNotificationId();
        lastNotificationTimeRef.current= getStoredLastNotificationTime();
      };
    } catch {
      // BroadcastChannel optional; unavailable in some browsers / private mode.
    }

    // ── Initial data fetch ───────────────────────────────────────────────────
    fetchMissedNotifications();

    // Re-fetch after socket reconnects to catch any missed events
    const unsubReconnect = onAdminReconnect(() => {
      setTimeout(() => fetchMissedNotifications(), RECONNECT_FETCH_DELAY);
    });

    return () => {
      mountedRef.current = false;
      document.removeEventListener('click',      unlockAudioAndPermission);
      document.removeEventListener('touchstart', unlockAudioAndPermission);
      unsubReconnect();
      if (bcRef.current) bcRef.current.close();
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  }, [fetchMissedNotifications, onNewNotification]);

  // ─── Socket connection ────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    const socket = getAdminSocket();
    if (!socket) return;

    // Remove any previously registered listeners to prevent duplicate handlers
    if (socketHandlersRef.current) {
      const { onConnect, onDisconnect, onNewNotif } = socketHandlersRef.current;
      socket.off('connect',           onConnect);
      socket.off('disconnect',        onDisconnect);
      socket.off('new_notification',  onNewNotif);
    }

    const onConnect    = () => { if (mountedRef.current) setSocketConnected(true); };
    const onDisconnect = () => { if (mountedRef.current) setSocketConnected(false); };
    const onNewNotif   = (rawNotif) => {
      handleNewNotification(rawNotif);
      // Broadcast to other admin tabs
      try {
        if (bcRef.current) {
          bcRef.current.postMessage({ type: 'new_notif', notification: rawNotif });
        }
      } catch {
        // Cross-tab sync is best-effort.
      }
    };

    socketHandlersRef.current = { onConnect, onDisconnect, onNewNotif };

    if (socket.connected) setSocketConnected(true);
    socket.on('connect',          onConnect);
    socket.on('disconnect',       onDisconnect);
    socket.on('new_notification', onNewNotif);
  }, [handleNewNotification]);

  useEffect(() => {
    connectSocket();
    const socket = getAdminSocket();

    // Fallback polling — only runs when socket is disconnected
    fallbackTimerRef.current = setInterval(fetchNotificationsFallback, FALLBACK_POLL_INTERVAL);

    return () => {
      if (socket && socketHandlersRef.current) {
        const { onConnect, onDisconnect, onNewNotif } = socketHandlersRef.current;
        socket.off('connect',          onConnect);
        socket.off('disconnect',       onDisconnect);
        socket.off('new_notification', onNewNotif);
        socketHandlersRef.current = null;
      }
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  }, [connectSocket, fetchNotificationsFallback]);

  return { notifications, socketConnected, playSound };
}
