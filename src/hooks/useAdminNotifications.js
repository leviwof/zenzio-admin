// =============================================================================
// useAdminNotifications.js — Production-grade notification hook
// =============================================================================
//
// Architecture:
//   Socket.IO (primary) → real-time, < 1s delivery
//   Polling 60s (fallback) → sleep/disconnect recovery
//   ?after=<id> on reconnect → fetch only missed notifications
//
// Sound escalation for NEW_ORDER:
//   Plays notification sound immediately, then repeats every 10s (max 3x)
//   until the notification is acknowledged (opened/read).
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

// Socket is primary — polling is only a fallback for sleep/disconnect recovery
const FALLBACK_POLL_INTERVAL = 60_000;   // 60 seconds
const RECONNECT_FETCH_DELAY  = 800;

// NEW_ORDER sound escalation
const ESCALATION_INTERVAL = 10_000; // 10 seconds between repeats
const MAX_ESCALATIONS     = 3;      // max 3 repeats after initial play

const NEW_ORDER_TYPES = new Set(['NEW_ORDER', 'ORDER_RECEIVED']);

function getNotifTime(n) {
  n = n || {};
  var t = Date.parse(n.createdAt || n.created_at || n.timestamp || '');
  return Number.isFinite(t) ? t : 0;
}

function compareNotifs(a, b) {
  var aId = Number(getNotificationId(a));
  var bId = Number(getNotificationId(b));
  if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return aId - bId;
  return getNotifTime(a) - getNotifTime(b);
}

function getLatestNotif(list) {
  list = list || [];
  return [...list].sort(compareNotifs).at(-1);
}

function normalizeNotif(raw) {
  if (!raw) return raw;
  var base = (raw.message !== undefined && !raw.body)
    ? Object.assign({}, raw, { body: raw.message })
    : Object.assign({}, raw);
  base.type = base.type || (base.data && base.data.type) || 'GENERAL';
  return base;
}

export default function useAdminNotifications(opts) {
  opts = opts || {};
  var onNotification    = opts.onNotification;
  var onSoundTrigger    = opts.onSoundTrigger;
  var onNewNotification = opts.onNewNotification;

  var socketConnectedState = useState(false);
  var socketConnected      = socketConnectedState[0];
  var setSocketConnected   = socketConnectedState[1];

  var permState          = useState(function() { return getPermissionState(); });
  var permissionState    = permState[0];
  var setPermissionState = permState[1];

  var onNotificationRef    = useRef(onNotification);
  var onSoundTriggerRef    = useRef(onSoundTrigger);
  var onNewNotificationRef = useRef(onNewNotification);

  useEffect(function() {
    onNotificationRef.current    = onNotification;
    onSoundTriggerRef.current    = onSoundTrigger;
    onNewNotificationRef.current = onNewNotification;
  });

  var initializedRef    = useRef(false);
  var lastIdRef         = useRef(getStoredLastNotificationId());
  var lastTimeRef       = useRef(getStoredLastNotificationTime());
  var localSeenIds      = useRef(new Set());
  var localNotifsRef    = useRef([]);
  var audioRef          = useRef(null);
  var audioUnlockedRef  = useRef(false);
  var pendingSoundRef   = useRef(null);
  var bcRef             = useRef(null);
  var fallbackTimerRef  = useRef(null);
  var mountedRef        = useRef(true);
  var socketHandlersRef = useRef(null);
  // escalationMapRef: { [idStr]: { count, timerId, acknowledged } }
  var escalationMapRef  = useRef({});

  var notifsState      = useState([]);
  var notifications    = notifsState[0];
  var setNotifications = notifsState[1];

  // ---------------------------------------------------------------------------
  // Audio
  // ---------------------------------------------------------------------------

  var playSound = useCallback(async function(notifId) {
    notifId = notifId != null ? notifId : null;
    if (!audioRef.current) {
      console.log(`[NotifDebug] playSound SKIPPED (no audioRef): id=${notifId}`);
      return false;
    }
    if (notifId != null && hasSoundPlayed(notifId)) {
      console.log(`[NotifDebug] playSound SKIPPED (sound already played): id=${notifId}`);
      return true;
    }
    var hasLock = await tryAcquireAudioLock();
    if (!hasLock) {
      console.log(`[NotifDebug] playSound SKIPPED (audio lock not acquired): id=${notifId}`);
      return true;
    }
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      if (notifId != null) markSoundPlayed(notifId);
      audioUnlockedRef.current = true;
      console.log(`[NotifDebug] playSound PLAYED: id=${notifId}`);
      return true;
    } catch (_e) {
      console.log(`[NotifDebug] playSound FAILED (autoplay blocked?): id=${notifId}, error=${_e}`);
      pendingSoundRef.current = notifId;
      return false;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Sound escalation for NEW_ORDER
  // ---------------------------------------------------------------------------

  var scheduleNextEscalation = useCallback(function scheduleNext(idStr, count) {
    if (!mountedRef.current) return;
    if (count >= MAX_ESCALATIONS) return;
    var entry = escalationMapRef.current[idStr];
    if (!entry || entry.acknowledged) return;

    entry.timerId = setTimeout(async function() {
      if (!mountedRef.current) return;
      var current = escalationMapRef.current[idStr];
      if (!current || current.acknowledged) return;

      // Intentional repeat — bypass per-ID sound dedup
      var hasLock = await tryAcquireAudioLock();
      if (hasLock && audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
        } catch (_e) {}
      }
      current.count = count + 1;
      scheduleNext(idStr, count + 1);
    }, ESCALATION_INTERVAL);
  }, []);

  var startEscalation = useCallback(function(notif) {
    var id = getNotificationId(notif);
    if (id == null) return;
    var idStr = String(id);
    if (escalationMapRef.current[idStr]) return;
    escalationMapRef.current[idStr] = { count: 0, timerId: null, acknowledged: false };
    scheduleNextEscalation(idStr, 0);
  }, [scheduleNextEscalation]);

  // Call when admin opens/reads a notification to stop escalation
  var acknowledgeNotification = useCallback(function(notifId) {
    if (notifId == null) return;
    var idStr = String(notifId);
    var entry = escalationMapRef.current[idStr];
    if (!entry) return;
    entry.acknowledged = true;
    if (entry.timerId) clearTimeout(entry.timerId);
    delete escalationMapRef.current[idStr];
  }, []);

  // ---------------------------------------------------------------------------
  // Core notification handler
  // ---------------------------------------------------------------------------

  var handleNewNotification = useCallback(function(rawNotif, opts2) {
    opts2 = opts2 || {};
    var alert         = opts2.alert !== false;
    var fromBroadcast = opts2.fromBroadcast === true;

    if (!mountedRef.current) {
      console.log(`[NotifDebug] handleNewNotification SKIPPED (unmounted)`);
      return;
    }

    var notif = normalizeNotif(rawNotif);
    var id    = getNotificationId(notif);
    var idStr = id != null ? String(id) : null;

    var type = String(notif.type || notif.data?.type || '').toUpperCase();
    console.log(`[NotifDebug] handleNewNotification RECEIVED: id=${idStr}, type=${type}, alert=${alert}, fromBroadcast=${fromBroadcast}`);

    if (idStr && localSeenIds.current.has(idStr)) {
      console.log(`[NotifDebug] handleNewNotification SKIPPED (already in localSeenIds): id=${idStr}`);
      return;
    }
    if (idStr) {
      localSeenIds.current.add(idStr);
      console.log(`[NotifDebug] handleNewNotification added to localSeenIds: id=${idStr}`);
    }

    localNotifsRef.current = [notif].concat(localNotifsRef.current).slice(0, 100);
    setNotifications(localNotifsRef.current.slice());

    if (onNotificationRef.current)    onNotificationRef.current(notif);
    if (onNewNotificationRef.current) onNewNotificationRef.current(notif);

    var important = isImportantAdminNotification(notif);
    var claimed   = claimAlert(notif);
    var shouldAlert = alert && !fromBroadcast && important && claimed;

    console.log(`[NotifDebug] handleNewNotification: important=${important}, claimed=${claimed}, shouldAlert=${shouldAlert}`);

    if (shouldAlert) {
      var isNewOrder = NEW_ORDER_TYPES.has(String(notif.type || '').toUpperCase());

      // NEW_ORDER notifications are handled by the polling path in OrdersList.jsx
      // (sound + desktop notification). The socket path should NOT duplicate them.
      // Other notification types (cancellations, payment failures, etc.) are still
      // handled by the socket path since polling doesn't cover those.
      if (!isNewOrder) {
        var content = buildDesktopNotificationContent(notif);
        var body    = content.body;

        console.log(`[NotifDebug] handleNewNotification TRIGGERING playSound + desktop: id=${idStr}, body="${body?.slice(0, 60)}"`);

        playSound(idStr).then(function(soundPlayed) {
          console.log(`[NotifDebug] handleNewNotification playSound resolved: soundPlayed=${soundPlayed}, now firing desktop notification`);
          showDesktopNotification(body, {
            notification:   notif,
            notificationId: id,
            type:           notif.type,
          });
        });

        if (onSoundTriggerRef.current) onSoundTriggerRef.current(notif);
        setPermissionState(getPermissionState());
      } else {
        console.log(`[NotifDebug] handleNewNotification SKIPPING socket sound+desktop for NEW_ORDER (polling handles it): id=${idStr}`);
      }
    } else {
      console.log(`[NotifDebug] handleNewNotification NO ALERT (alert=${alert}, fromBroadcast=${fromBroadcast}, important=${important}, claimed=${claimed})`);
    }

    rememberLastNotification(notif);
    lastIdRef.current   = getStoredLastNotificationId();
    lastTimeRef.current = getStoredLastNotificationTime();
  }, [playSound, startEscalation]);

  // ---------------------------------------------------------------------------
  // Fetch & process (initial load + reconnect recovery + fallback poll)
  // ---------------------------------------------------------------------------

  var fetchAndProcess = useCallback(async function(afterId) {
    try {
      var response = await getNotifications(afterId ? { after: afterId } : undefined);
      var docs = [];
      if      (Array.isArray(response.data && response.data.data))          docs = response.data.data;
      else if (Array.isArray(response.data && response.data.notifications)) docs = response.data.notifications;
      else if (Array.isArray(response.data))                                docs = response.data;
      if (!Array.isArray(docs)) docs = [];

      if (!initializedRef.current) {
        // Seed all existing IDs so they are never re-alerted
        var docCount = 0;
        docs.forEach(function(n) {
          var nid = getNotificationId(n);
          if (nid != null) { localSeenIds.current.add(String(nid)); docCount++; }
        });
        seedAlertedIds(docs);
        localNotifsRef.current = docs.slice(0, 100);
        setNotifications(localNotifsRef.current.slice());
        var latest = getLatestNotif(docs);
        if (latest) {
          rememberLastNotification(latest);
          lastIdRef.current   = getStoredLastNotificationId();
          lastTimeRef.current = getStoredLastNotificationTime();
        }
        initializedRef.current = true;
        setPermissionState(getPermissionState());
        console.log(`[NotifDebug] fetchAndProcess INITIAL LOAD: ${docs.length} docs, ${docCount} IDs seeded into localSeenIds. lastId=${lastIdRef.current}`);
        return;
      }

      // Subsequent call — only alert genuinely new notifications
      var missed = docs.filter(function(n) {
        var nid = getNotificationId(n);
        if (nid == null) return false;
        if (localSeenIds.current.has(String(nid))) {
          return false;
        }
        if (afterId) return true; // server already filtered server-side
        return isNotificationNewer(n, lastIdRef.current, lastTimeRef.current);
      });

      console.log(`[NotifDebug] fetchAndProcess POLL: ${docs.length} docs, ${missed.length} missed, afterId=${afterId}, lastId=${lastIdRef.current}`);

      if (missed.length > 0) {
        missed.slice().sort(compareNotifs).forEach(function(n) {
          handleNewNotification(n, { alert: true });
        });
      }
    } catch (_e) {
      // non-fatal
    }
  }, [handleNewNotification]);

  // ---------------------------------------------------------------------------
  // Setup / teardown
  // ---------------------------------------------------------------------------

  useEffect(function() {
    mountedRef.current = true;

    var soundPath = (import.meta.env.BASE_URL || '/') + 'notification.mp3';
    audioRef.current = new Audio(soundPath);
    audioRef.current.preload = 'auto';

    var unlockAudio = async function() {
      requestDesktopNotificationPermissionOnce({ fromUserGesture: true })
        .then(function() { setPermissionState(getPermissionState()); })
        .catch(function() {});

      if (!audioUnlockedRef.current) {
        try {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioUnlockedRef.current = true;

          if (pendingSoundRef.current != null) {
            var queuedId = pendingSoundRef.current;
            pendingSoundRef.current = null;
            var hasLock = await tryAcquireAudioLock();
            if (hasLock) {
              try {
                audioRef.current.currentTime = 0;
                await audioRef.current.play();
                if (queuedId != null) markSoundPlayed(queuedId);
              } catch (_e2) {}
            }
          }
        } catch (_e) {}
      }
    };

    document.addEventListener('click',      unlockAudio, { passive: true });
    document.addEventListener('mousedown',  unlockAudio, { passive: true });
    document.addEventListener('keydown',    unlockAudio, { passive: true });
    document.addEventListener('touchstart', unlockAudio, { passive: true });

    requestDesktopNotificationPermissionOnce()
      .then(function(perm) {
        console.log(`[NotifDebug] Initial permission request resolved: ${perm || Notification.permission}`);
        setPermissionState(getPermissionState());
      })
      .catch(function(err) {
        console.log(`[NotifDebug] Initial permission request error: ${err}`);
      });

    // Multi-tab sync
    try {
      bcRef.current = new BroadcastChannel('admin_notifications');
      bcRef.current.onmessage = function(event) {
        if (!event.data || event.data.type !== 'new_notif') return;
        var raw = event.data.notification;
        if (!raw || !mountedRef.current) return;
        handleNewNotification(raw, { alert: true, fromBroadcast: true });
      };
    } catch (_e) {}

    // Initial fetch seeds alerted IDs — no desktop popups triggered
    fetchAndProcess();

    // After socket reconnect, fetch only missed notifications via ?after=lastId
    var unsubReconnect = onAdminReconnect(function() {
      setTimeout(function() {
        fetchAndProcess(lastIdRef.current || undefined);
      }, RECONNECT_FETCH_DELAY);
    });

    return function() {
      mountedRef.current = false;
      // Clear all pending escalation timers
      Object.values(escalationMapRef.current).forEach(function(entry) {
        if (entry && entry.timerId) clearTimeout(entry.timerId);
      });
      escalationMapRef.current = {};
      document.removeEventListener('click',      unlockAudio);
      document.removeEventListener('mousedown',  unlockAudio);
      document.removeEventListener('keydown',    unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      unsubReconnect();
      if (bcRef.current) { bcRef.current.close(); bcRef.current = null; }
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Socket connection
  // ---------------------------------------------------------------------------

  var connectSocket = useCallback(function() {
    var socket = getAdminSocket();
    if (!socket) return;

    if (socketHandlersRef.current) {
      socket.off('connect',          socketHandlersRef.current.onConnect);
      socket.off('disconnect',       socketHandlersRef.current.onDisconnect);
      socket.off('new_notification', socketHandlersRef.current.onNewNotif);
      socket.off('notification:new', socketHandlersRef.current.onNewNotif);
      socket.off('order:new',        socketHandlersRef.current.onNewNotif);
      socket.off('order:update',     socketHandlersRef.current.onNewNotif);
    }

    var onConnect    = function() { if (mountedRef.current) setSocketConnected(true); };
    var onDisconnect = function() { if (mountedRef.current) setSocketConnected(false); };
    var onNewNotif   = function(rawNotif) {
      console.log(`[NotifDebug] Socket onNewNotif RECEIVED:`, rawNotif?.id || rawNotif?.notificationId, JSON.stringify(rawNotif).slice(0, 200));
      handleNewNotification(rawNotif, { alert: true });
      try {
        if (bcRef.current) bcRef.current.postMessage({ type: 'new_notif', notification: rawNotif });
      } catch (_e) {}
    };

    socketHandlersRef.current = { onConnect, onDisconnect, onNewNotif };

    if (socket.connected) setSocketConnected(true);
    socket.on('connect',          onConnect);
    socket.on('disconnect',       onDisconnect);
    // Listen on all event names; backend emits all three for compatibility
    socket.on('new_notification', onNewNotif);
    socket.on('notification:new', onNewNotif);
    socket.on('order:new',        onNewNotif);
    socket.on('order:update',     onNewNotif);
  }, [handleNewNotification]);

  useEffect(function() {
    connectSocket();
    // 60s fallback poll — socket handles real-time; polling is sleep/disconnect recovery only
    fallbackTimerRef.current = setInterval(function() {
      fetchAndProcess(undefined);
    }, FALLBACK_POLL_INTERVAL);

    return function() {
      var socket = getAdminSocket();
      if (socket && socketHandlersRef.current) {
        socket.off('connect',          socketHandlersRef.current.onConnect);
        socket.off('disconnect',       socketHandlersRef.current.onDisconnect);
        socket.off('new_notification', socketHandlersRef.current.onNewNotif);
        socket.off('notification:new', socketHandlersRef.current.onNewNotif);
        socket.off('order:new',        socketHandlersRef.current.onNewNotif);
        socket.off('order:update',     socketHandlersRef.current.onNewNotif);
      }
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  }, [connectSocket, fetchAndProcess]);

  return {
    notifications,
    socketConnected,
    permissionState,
    acknowledgeNotification,
  };
}
