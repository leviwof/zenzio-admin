// =============================================================================
// useAdminNotifications.js — Production-grade notification hook
//
// Architecture:
//   • WebSocket = primary source (real-time, instant)
//   • Polling   = safety-net fallback every 5s (dedup handles duplicates)
//   • BroadcastChannel = cross-tab list sync (no re-alerting)
//
// Deduplication layers:
//   1. In-memory Set (localSeenIds)  — fastest, resets on unmount
//   2. localStorage claimAlert      — persists across refresh (primary gate)
//   3. seedAlertedIds on first load — pre-marks historical IDs so they NEVER replay
//
// Callback stability:
//   onNotification / onSoundTrigger / onNewNotification are stored in refs so
//   handleNewNotification (and everything that depends on it) stays STABLE across
//   renders — socket handlers are never torn down and re-registered unnecessarily.
// =============================================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { getAdminSocket, onAdminReconnect } from '../services/socket';
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

// Safety-net poll — even if socket works, this catches anything missed.
// Dedup ensures no duplicate alerts. 5s = max possible delay if socket fails.
const FALLBACK_POLL_INTERVAL = 5_000;
const RECONNECT_FETCH_DELAY  = 800;   // ms — wait after socket reconnect before re-fetch

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

  // ── Stable callback refs ────────────────────────────────────────────────────
  // Storing callbacks in refs means handleNewNotification (and all derived
  // callbacks) never changes identity, so socket handlers are registered ONCE
  // and never accidentally torn down on a parent re-render.
  const onNotificationRef    = useRef(onNotification);
  const onSoundTriggerRef    = useRef(onSoundTrigger);
  const onNewNotificationRef = useRef(onNewNotification);
  useEffect(() => {
    onNotificationRef.current    = onNotification;
    onSoundTriggerRef.current    = onSoundTrigger;
    onNewNotificationRef.current = onNewNotification;
  }); // runs after every render — always fresh

  // ── State refs ──────────────────────────────────────────────────────────────
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
   *   1. hasSoundPlayed(id)     — localStorage dedup (survives refresh)
   *   2. tryAcquireAudioLock()  — multi-tab lock (one tab plays at a time)
   *   3. autoplay policy        — if blocked, queues for next user gesture
   */
  const playSound = useCallback(async (notifId = null) => {
    if (!audioRef.current) return false;

    // localStorage dedup — never replay sound for the same ID
    if (notifId != null && hasSoundPlayed(notifId)) return true;

    // Multi-tab lock — only one tab plays at a time
    const hasLock = await tryAcquireAudioLock();
    if (!hasLock) return true;

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      // Mark AFTER successful play — if play() throws, ID stays unmarked
      // so unlockAudio can retry it on the next user gesture
      if (notifId != null) markSoundPlayed(notifId);
      audioUnlockedRef.current = true;
      return true;
    } catch {
      // Autoplay blocked — queue for next user gesture (NOT marked as played)
      pendingSoundRef.current = notifId;
      return false;
    }
  }, []); // stable — no external deps

  // ─── Core notification handler ───────────────────────────────────────────────
  /**
   * Process a single incoming notification.
   * Uses callback REFS so this function is stable across renders.
   *
   * @param {object}  rawNotif
   * @param {boolean} alert         — false = list-only (no sound/popup)
   * @param {boolean} fromBroadcast — came from another tab; update list only
   */
  const handleNewNotification = useCallback(
    (rawNotif, { alert = true, fromBroadcast = false } = {}) => {
      if (!mountedRef.current) return;

      const notif = normalizeNotif(rawNotif);
      const id    = getNotificationId(notif);
      const idStr = id != null ? String(id) : null;

      // In-memory dedup (fastest gate)
      if (idStr && localSeenIds.current.has(idStr)) return;
      if (idStr) localSeenIds.current.add(idStr);

      // Update list state
      localNotifsRef.current = [notif, ...localNotifsRef.current].slice(0, 100);
      setNotifications([...localNotifsRef.current]);

      // Stable via refs — never cause this callback to change identity
      if (onNotificationRef.current)    onNotificationRef.current(notif);
      if (onNewNotificationRef.current) onNewNotificationRef.current(notif);

      // Alert path: sound + OS desktop notification
      // Skipped if: alert=false, fromBroadcast, not important, or already claimed
      if (alert && !fromBroadcast && isImportantAdminNotification(notif) && claimAlert(notif)) {
        const { body } = buildDesktopNotificationContent(notif);

        // Sound — deduped by ID + multi-tab lock
        playSound(idStr).then((didPlaySound) => {
          showDesktopNotification(body, {
            notification:   notif,
            notificationId: id,
            type:           notif.type,
            silent:         didPlaySound,
          });
        });
        if (onSoundTriggerRef.current) onSoundTriggerRef.current(notif);

        setPermissionState(getPermissionState());
      }

      rememberLastNotification(notif);
      lastIdRef.current   = getStoredLastNotificationId();
      lastTimeRef.current = getStoredLastNotificationTime();
    },
    [playSound], // stable — playSound has [] deps; callbacks are in refs
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
        // Pre-mark every fetched ID in all dedup stores so historical
        // notifications NEVER trigger sound or desktop popup — not even via
        // socket catchup events that arrive right after page load.
        docs.forEach(n => {
          const id = getNotificationId(n);
          if (id != null) localSeenIds.current.add(String(id));
        });

        seedAlertedIds(docs); // marks all 3 localStorage stores

        localNotifsRef.current = docs.slice(0, 100);
        setNotifications([...localNotifsRef.current]);

        const latest = getLatestNotif(docs);
        if (latest) {
          rememberLastNotification(latest);
          lastIdRef.current   = getStoredLastNotificationId();
          lastTimeRef.current = getStoredLastNotificationTime();
        }

        initializedRef.current = true;
        setPermissionState(getPermissionState());
        return;
      }

      // ── SUBSEQUENT POLLS ────────────────────────────────────────────────
      // Only process notifications genuinely newer than last-seen.
      // claimAlert + localSeenIds ensure no duplicate alerts even at 5s poll.
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
      // Non-fatal — next poll or socket event recovers
    }
  }, [handleNewNotification]);

  // Safety-net poll — always runs every 5s regardless of socket state.
  // dedup layers ensure no duplicate alerts.
  const pollFallback = useCallback(async () => {
    await fetchAndProcess();
  }, [fetchAndProcess]);

  // ─── Setup: audio, BroadcastChannel, permission, initial fetch ─────────────
  useEffect(() => {
    mountedRef.current = true;

    // ── Audio ──────────────────────────────────────────────────────────────
    const soundPath = `${import.meta.env.BASE_URL}loudNotificationSound.mpeg`;
    audioRef.current = new Audio(soundPath);
    audioRef.current.preload = 'auto';

    const unlockAudio = async () => {
      // Request notification permission inside user-gesture context
      requestDesktopNotificationPermissionOnce({ fromUserGesture: true })
        .then(() => setPermissionState(getPermissionState()))
        .catch(() => {});

      if (!audioUnlockedRef.current) {
        try {
          // Play + immediately pause to satisfy browser autoplay policy.
          // This is silent (paused before it's audible).
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioUnlockedRef.current = true;

          // Play any sound that was queued before audio was unlocked.
          // Do NOT check hasSoundPlayed here — play() failed before so it was
          // never marked; checking would silently swallow the pending sound.
          if (pendingSoundRef.current != null) {
            const queuedId = pendingSoundRef.current;
            pendingSoundRef.current = null;
            const hasLock = await tryAcquireAudioLock();
            if (hasLock) {
              try {
                audioRef.current.currentTime = 0;
                await audioRef.current.play();
                if (queuedId != null) markSoundPlayed(queuedId);
              } catch { /* still blocked */ }
            }
          }
        } catch { /* autoplay still blocked */ }
      }
    };

    // Unlock on any user interaction — the sooner audio is unlocked,
    // the sooner the first real notification sound can play instantly.
    document.addEventListener('click',      unlockAudio, { passive: true });
    document.addEventListener('mousedown',  unlockAudio, { passive: true });
    document.addEventListener('keydown',    unlockAudio, { passive: true });
    document.addEventListener('touchstart', unlockAudio, { passive: true });

    // Passive permission check (no prompt if already decided)
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
        // fromBroadcast=true: update list ONLY — originating tab handles alert
        handleNewNotification(raw, { alert: true, fromBroadcast: true });
      };
    } catch {
      // BroadcastChannel unavailable (private mode, older browsers)
    }

    // ── Initial fetch (seeds dedup stores before socket starts alerting) ───
    fetchAndProcess();

    // Re-fetch after socket reconnect to catch events missed during disconnect
    const unsubReconnect = onAdminReconnect(() => {
      setTimeout(() => fetchAndProcess(), RECONNECT_FETCH_DELAY);
    });

    return () => {
      mountedRef.current = false;
      document.removeEventListener('click',      unlockAudio);
      document.removeEventListener('mousedown',  unlockAudio);
      document.removeEventListener('keydown',    unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      unsubReconnect();
      if (bcRef.current) { bcRef.current.close(); bcRef.current = null; }
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs once on mount

  // ─── Socket connection ────────────────────────────────────────────────────
  // connectSocket depends only on handleNewNotification (stable → this is stable).
  // Socket handlers are registered ONCE and stay registered.
  const connectSocket = useCallback(() => {
    const socket = getAdminSocket();
    if (!socket) return;

    // Remove old handlers before re-registering (safe on hot reload / StrictMode)
    if (socketHandlersRef.current) {
      const { onConnect, onDisconnect, onNewNotif } = socketHandlersRef.current;
      socket.off('connect',          onConnect);
      socket.off('disconnect',       onDisconnect);
      socket.off('new_notification', onNewNotif);
    }

    const onConnect    = () => { if (mountedRef.current) setSocketConnected(true); };
    const onDisconnect = () => { if (mountedRef.current) setSocketConnected(false); };

    const onNewNotif = (rawNotif) => {
      // This tab received the event — handle alert immediately (< 100ms latency)
      handleNewNotification(rawNotif, { alert: true });

      // Broadcast to other open admin tabs so their list stays in sync
      try {
        bcRef.current?.postMessage({ type: 'new_notif', notification: rawNotif });
      } catch { /* best-effort */ }
    };

    socketHandlersRef.current = { onConnect, onDisconnect, onNewNotif };

    if (socket.connected) setSocketConnected(true);
    socket.on('connect',          onConnect);
    socket.on('disconnect',       onDisconnect);
    socket.on('new_notification', onNewNotif);
  }, [handleNewNotification]); // stable because handleNewNotification is stable

  // Register socket once + start fallback polling
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
