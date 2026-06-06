// =============================================================================
// useAdminNotifications.js — Production-grade notification hook
//
// Architecture:
//   • WebSocket = primary source (real-time)
//   • Polling   = fallback (runs only when socket is disconnected)
//   • BroadcastChannel = cross-tab list sync (no re-alerting)
//
// Deduplication layers:
//   1. In-memory Set (localSeenIds)  — fastest, resets on unmount
//   2. localStorage claimAlert      — persists across refresh (primary gate)
//   3. seedAlertedIds on first load — pre-marks historical IDs so they never replay
//
// Multi-tab:
//   • Tab receiving socket event broadcasts to others via BroadcastChannel
//   • Other tabs update list state ONLY — no sound, no popup
//   • tryAcquireAudioLock() prevents simultaneous sound when both tabs have socket
// =============================================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { getAdminSocket, onAdminReconnect, isAdminSocketConnected } from '../services/socket';
import { getNotifications } from '../services/api';
import {
  buildDesktopNotificationContent,
  claimAlert,
  getNotificationId,
  getStoredLastNotificationId,
  getStoredLastNotificationTime,
  hasSoundPlayed,
  isImportantAdminNotification,
  isNotificationNewer,
  markSoundPlayed,
  rememberLastNotification,
  requestDesktopNotificationPermissionOnce,
  seedAlertedIds,
  showDesktopNotification,
  tryAcquireAudioLock,
  getPermissionState,
} from '../services/desktopNotificationService';

const FALLBACK_POLL_INTERVAL = 35_000;  // ms — only runs when socket is disconnected
const RECONNECT_FETCH_DELAY  = 2_000;   // ms — wait after socket reconnect before re-fetch

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNotifTime(n = {}) {
  const t = Date.parse(n.createdAt || n.created_at || n.timestamp || '');
  return Number.isFinite(t) ? t : 0;
}

function compareNotifs(a, b) {
  const aId = Number(getNotificationId(a));
  const bId = Number(getNotificationId(b));
  if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return aId - bId;
  return getNotifTime(a) - getNotifTime(b);
}

function getLatestNotif(list = []) {
  return [...list].sort(compareNotifs).at(-1);
}

/**
 * Normalize raw socket/API payload.
 * Backend sends { message, type } but entity has { body, type }.
 */
function normalizeNotif(raw = {}) {
  if (!raw) return raw;
  const base = raw.message !== undefined && !raw.body
    ? { ...raw, body: raw.message }
    : { ...raw };
  base.type = base.type || base.data?.type || 'GENERAL';
  return base;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function useAdminNotifications({
  onNotification,
  onSoundTrigger,
  onNewNotification,
} = {}) {
  const [socketConnected, setSocketConnected] = useState(false);
  const [permissionState, setPermissionState] = useState(() => getPermissionState());

  // Refs — survive re-renders, reset on unmount
  const initializedRef       = useRef(false);
  const lastIdRef            = useRef(getStoredLastNotificationId());
  const lastTimeRef          = useRef(getStoredLastNotificationTime());
  const localSeenIds         = useRef(new Set());  // fast in-memory dedup
  const localNotifsRef       = useRef([]);          // list state cache
  const audioRef             = useRef(null);
  const audioUnlockedRef     = useRef(false);
  const pendingSoundRef      = useRef(null);        // sound queued before audio unlocked
  const bcRef                = useRef(null);        // BroadcastChannel
  const fallbackTimerRef     = useRef(null);
  const mountedRef           = useRef(true);
  const socketHandlersRef    = useRef(null);

  const [notifications, setNotifications] = useState([]);

  // ─── Sound ──────────────────────────────────────────────────────────────────
  /**
   * Play notification.mp3 once per unique notification ID.
   * Guards:
   *   1. hasSoundPlayed(id)      — localStorage dedup (survives refresh)
   *   2. tryAcquireAudioLock()   — multi-tab lock (one tab plays at a time)
   *   3. audioUnlockedRef        — browser autoplay policy gate
   */
  const playSound = useCallback(async (notifId = null) => {
    if (!audioRef.current) return;

    // localStorage dedup — never replay sound for the same ID
    if (notifId != null) {
      if (hasSoundPlayed(notifId)) return;
    }

    // Multi-tab lock — only one tab plays at a time
    const hasLock = await tryAcquireAudioLock();
    if (!hasLock) return;

    // Mark as played BEFORE attempting play to prevent race
    if (notifId != null) markSoundPlayed(notifId);

    // Audio not yet unlocked (browser requires user gesture first)
    if (!audioUnlockedRef.current) {
      pendingSoundRef.current = notifId;
      return;
    }

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch {
      // Autoplay blocked — nothing we can do without user gesture
    }
  }, []);

  // ─── Core notification handler ───────────────────────────────────────────────
  /**
   * Process a single incoming notification.
   *
   * @param {object}  rawNotif
   * @param {object}  opts
   * @param {boolean} opts.alert      — false = list-only update (no sound/popup)
   * @param {boolean} opts.fromBroadcast — came from another tab; never alert
   */
  const handleNewNotification = useCallback(
    (rawNotif, { alert = true, fromBroadcast = false } = {}) => {
      if (!mountedRef.current) return;

      const notif = normalizeNotif(rawNotif);
      const id    = getNotificationId(notif);
      const idStr = id != null ? String(id) : null;

      // In-memory dedup (fastest gate — prevents double-processing in same session)
      if (idStr && localSeenIds.current.has(idStr)) return;
      if (idStr) localSeenIds.current.add(idStr);

      // Update list state
      localNotifsRef.current = [notif, ...localNotifsRef.current].slice(0, 100);
      setNotifications([...localNotifsRef.current]);

      if (onNotification)    onNotification(notif);
      if (onNewNotification) onNewNotification(notif);

      // Alert path: sound + OS desktop notification
      // Skipped if: alert=false, fromBroadcast, not important, or already claimed
      if (alert && !fromBroadcast && isImportantAdminNotification(notif) && claimAlert(notif)) {
        const { body } = buildDesktopNotificationContent(notif);

        // Sound — deduped by ID + multi-tab lock
        playSound(idStr);
        if (onSoundTrigger) onSoundTrigger(notif);

        // OS notification (Windows Notification Center)
        showDesktopNotification(body, {
          notification:   notif,
          notificationId: id,
          type:           notif.type,
        });

        // Update permission state in case it changed
        setPermissionState(getPermissionState());
      }

      rememberLastNotification(notif);
      lastIdRef.current   = getStoredLastNotificationId();
      lastTimeRef.current = getStoredLastNotificationTime();
    },
    [onNotification, onSoundTrigger, onNewNotification, playSound],
  );

  // ─── Fetch / polling ─────────────────────────────────────────────────────────
  const fetchAndProcess = useCallback(async () => {
    try {
      const response = await getNotifications();
      let docs = [];
      if      (Array.isArray(response.data?.data))          docs = response.data.data;
      else if (Array.isArray(response.data?.notifications)) docs = response.data.notifications;
      else if (Array.isArray(response.data))                docs = response.data;

      if (!Array.isArray(docs)) docs = [];

      if (!initializedRef.current) {
        // ── FIRST LOAD ──────────────────────────────────────────────────────
        // 1. Seed in-memory dedup so socket catchup events don't re-alert
        // 2. Pre-mark ALL fetched IDs in localStorage so they never replay
        //    even on cold start (first-ever login)
        docs.forEach(n => {
          const id = getNotificationId(n);
          if (id != null) localSeenIds.current.add(String(id));
        });

        seedAlertedIds(docs); // Critical: prevents historical replay

        localNotifsRef.current = docs.slice(0, 100);
        setNotifications([...localNotifsRef.current]);

        const latest = getLatestNotif(docs);
        if (latest) {
          rememberLastNotification(latest);
          lastIdRef.current   = getStoredLastNotificationId();
          lastTimeRef.current = getStoredLastNotificationTime();
        }

        initializedRef.current = true;

        // Check permission state after first load
        setPermissionState(getPermissionState());
        return;
      }

      // ── SUBSEQUENT POLLS ────────────────────────────────────────────────
      // Only process notifications genuinely newer than last-seen
      const missed = docs.filter(n => {
        const id = getNotificationId(n);
        if (id == null) return false;
        if (localSeenIds.current.has(String(id))) return false;
        return isNotificationNewer(n, lastIdRef.current, lastTimeRef.current);
      });

      if (missed.length > 0) {
        [...missed]
          .sort(compareNotifs)
          .forEach(n => handleNewNotification(n, { alert: true }));
      }
    } catch {
      // Polling errors are non-fatal — next interval or socket event recovers
    }
  }, [handleNewNotification]);

  // Fallback polling — only when socket is disconnected
  const pollFallback = useCallback(async () => {
    if (isAdminSocketConnected()) return;
    await fetchAndProcess();
  }, [fetchAndProcess]);

  // ─── Setup: audio, BroadcastChannel, permission, initial fetch ─────────────
  useEffect(() => {
    mountedRef.current = true;

    // ── Audio ──────────────────────────────────────────────────────────────
    const soundPath = `${import.meta.env.BASE_URL}notification.mp3`;
    audioRef.current = new Audio(soundPath);
    audioRef.current.preload = 'auto';

    const unlockAudio = async () => {
      // Req #1: request permission inside user-gesture context
      requestDesktopNotificationPermissionOnce({ fromUserGesture: true })
        .then(() => setPermissionState(getPermissionState()))
        .catch(() => {});

      if (!audioUnlockedRef.current) {
        try {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioUnlockedRef.current = true;

          // Play any sound that was queued before audio was unlocked
          if (pendingSoundRef.current !== undefined && pendingSoundRef.current !== null) {
            const queuedId = pendingSoundRef.current;
            pendingSoundRef.current = null;
            // Check the lock again before playing the queued sound
            const hasLock = await tryAcquireAudioLock();
            if (hasLock && !hasSoundPlayed(queuedId)) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
          }
        } catch { /* autoplay blocked — need gesture */ }
      }
    };

    document.addEventListener('click',      unlockAudio, { passive: true });
    document.addEventListener('touchstart', unlockAudio, { passive: true });

    // Passive permission check (no-op if already decided)
    requestDesktopNotificationPermissionOnce()
      .then(() => setPermissionState(getPermissionState()))
      .catch(() => {});

    // ── BroadcastChannel — cross-tab list sync ─────────────────────────────
    try {
      bcRef.current = new BroadcastChannel('admin_notifications');
      bcRef.current.onmessage = (event) => {
        if (event.data?.type !== 'new_notif') return;
        const raw = event.data.notification;
        if (!raw || !mountedRef.current) return;

        // fromBroadcast=true: update list ONLY — no sound, no popup
        // The tab that broadcast this already handled alert
        handleNewNotification(raw, { alert: true, fromBroadcast: true });
      };
    } catch {
      // BroadcastChannel unavailable in some contexts (private mode, older browsers)
    }

    // ── Initial fetch ──────────────────────────────────────────────────────
    fetchAndProcess();

    // Re-fetch after socket reconnect to catch events missed during disconnect
    const unsubReconnect = onAdminReconnect(() => {
      setTimeout(() => fetchAndProcess(), RECONNECT_FETCH_DELAY);
    });

    return () => {
      mountedRef.current = false;
      document.removeEventListener('click',      unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      unsubReconnect();
      if (bcRef.current) { bcRef.current.close(); bcRef.current = null; }
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs once on mount

  // ─── Socket connection ────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    const socket = getAdminSocket();
    if (!socket) return;

    // Remove old handlers to prevent duplicates on re-connect
    if (socketHandlersRef.current) {
      const { onConnect, onDisconnect, onNewNotif } = socketHandlersRef.current;
      socket.off('connect',          onConnect);
      socket.off('disconnect',       onDisconnect);
      socket.off('new_notification', onNewNotif);
    }

    const onConnect    = () => { if (mountedRef.current) setSocketConnected(true); };
    const onDisconnect = () => { if (mountedRef.current) setSocketConnected(false); };

    const onNewNotif = (rawNotif) => {
      // This tab received the socket event — it handles alert
      handleNewNotification(rawNotif, { alert: true });

      // Broadcast to other admin tabs so they sync their list
      try {
        bcRef.current?.postMessage({ type: 'new_notif', notification: rawNotif });
      } catch { /* cross-tab sync is best-effort */ }
    };

    socketHandlersRef.current = { onConnect, onDisconnect, onNewNotif };

    if (socket.connected) setSocketConnected(true);
    socket.on('connect',          onConnect);
    socket.on('disconnect',       onDisconnect);
    socket.on('new_notification', onNewNotif);
  }, [handleNewNotification]);

  // Register socket + start fallback polling
  useEffect(() => {
    connectSocket();
    fallbackTimerRef.current = setInterval(pollFallback, FALLBACK_POLL_INTERVAL);

    return () => {
      const socket = getAdminSocket();
      if (socket && socketHandlersRef.current) {
        const { onConnect, onDisconnect, onNewNotif } = socketHandlersRef.current;
        socket.off('connect',          onConnect);
        socket.off('disconnect',       onDisconnect);
        socket.off('new_notification', onNewNotif);
        socketHandlersRef.current = null;
      }
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  }, [connectSocket, pollFallback]);

  return { notifications, socketConnected, playSound, permissionState };
}
