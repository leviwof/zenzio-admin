// =============================================================================
// useAdminNotifications.js — Reliable, socket-first notification delivery
// =============================================================================
//
// Architecture:
//   Socket.IO "order:new"  → primary real-time source for ALL 4 actions:
//                            A. Bell update  B. Notification list
//                            C. Desktop popup  D. Sound
//   Polling 60s            → history sync ONLY, never triggers desktop/sound
//   Reconnect recovery     → fetches missed notifications (?after=lastId),
//                            re-alerts them (they were missed real-time events)
//
// Multi-tab:
//   BroadcastChannel — the tab that receives the socket event plays sound +
//   shows desktop.  Other tabs receive the BC message and update UI only.
//   tryAcquireAudioLock provides a second layer for sound dedup.
//
// Deduplication:
//   processedOrderIds  — in-memory Set of order IDs already handled this session
//   localSeenIds       — in-memory Set of notification IDs already processed
//   claimAlert         — localStorage-persisted per-notification-ID claim
//   hasSoundPlayed     — localStorage-persisted per-notification-ID sound flag
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

const FALLBACK_POLL_INTERVAL = 60_000;  // polling when socket is connected (history sync)
const DISCONNECTED_POLL_INTERVAL = 15_000; // faster poll + alerts when socket is down
const RECONNECT_FETCH_DELAY  = 800;

// NEW_ORDER sound escalation: repeats every 10s, max 3 additional plays
const ESCALATION_INTERVAL = 10_000;
const MAX_ESCALATIONS     = 3;

const NEW_ORDER_TYPES = new Set(['NEW_ORDER', 'ORDER_RECEIVED']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

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

  var initializedRef     = useRef(false);
  var lastIdRef          = useRef(getStoredLastNotificationId());
  var lastTimeRef        = useRef(getStoredLastNotificationTime());
  var localSeenIds       = useRef(new Set());
  // processedOrderIds: dedup by orderId so the same order never triggers twice
  var processedOrderIds  = useRef(new Set());
  var localNotifsRef     = useRef([]);
  var audioRef           = useRef(null);
  var audioUnlockedRef   = useRef(false);
  var pendingSoundRef    = useRef(null);
  var bcRef              = useRef(null);
  var fallbackTimerRef   = useRef(null);
  var mountedRef         = useRef(true);
  var socketHandlersRef  = useRef(null);
  // escalationMapRef: { [idStr]: { count, timerId, acknowledged } }
  var escalationMapRef   = useRef({});

  var notifsState      = useState([]);
  var notifications    = notifsState[0];
  var setNotifications = notifsState[1];

  // ── Audio ──────────────────────────────────────────────────────────────────

  var playSound = useCallback(async function(notifId) {
    notifId = notifId != null ? notifId : null;
    if (!audioRef.current) {
      console.log('[NotifDebug] Sound Played SKIPPED (no audio element): id=' + notifId);
      return false;
    }
    if (notifId != null && hasSoundPlayed(notifId)) {
      console.log('[NotifDebug] Sound Played SKIPPED (already played): id=' + notifId);
      return true;
    }
    var hasLock = await tryAcquireAudioLock();
    if (!hasLock) {
      console.log('[NotifDebug] Sound Played SKIPPED (audio lock held by another tab): id=' + notifId);
      return true; // another tab is playing — that is the desired behaviour
    }
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      if (notifId != null) markSoundPlayed(notifId);
      audioUnlockedRef.current = true;
      console.log('[NotifDebug] Sound Played: id=' + notifId);
      return true;
    } catch (_e) {
      console.log('[NotifDebug] Sound Played FAILED (autoplay blocked): id=' + notifId + ', error=' + _e);
      pendingSoundRef.current = notifId;
      return false;
    }
  }, []);

  // ── Escalation (NEW_ORDER repeats every 10 s, max 3 additional plays) ──────

  var scheduleNextEscalation = useCallback(function scheduleNext(idStr, count) {
    if (!mountedRef.current) return;
    if (count >= MAX_ESCALATIONS) return;
    var entry = escalationMapRef.current[idStr];
    if (!entry || entry.acknowledged) return;

    entry.timerId = setTimeout(async function() {
      if (!mountedRef.current) return;
      var current = escalationMapRef.current[idStr];
      if (!current || current.acknowledged) return;

      var hasLock = await tryAcquireAudioLock();
      if (hasLock && audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          console.log('[NotifDebug] Sound Played (escalation #' + (count + 1) + '): id=' + idStr);
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

  var acknowledgeNotification = useCallback(function(notifId) {
    if (notifId == null) return;
    var idStr = String(notifId);
    var entry = escalationMapRef.current[idStr];
    if (!entry) return;
    entry.acknowledged = true;
    if (entry.timerId) clearTimeout(entry.timerId);
    delete escalationMapRef.current[idStr];
  }, []);

  // ── Core notification handler ──────────────────────────────────────────────
  //
  // alert:         true  = may play sound + show desktop (socket / reconnect)
  //                false = UI update only (60 s fallback poll)
  // fromBroadcast: true  = received via BroadcastChannel — UI update only,
  //                        another tab already played sound + showed desktop

  var handleNewNotification = useCallback(function(rawNotif, opts2) {
    opts2 = opts2 || {};
    var alert         = opts2.alert !== false;
    var fromBroadcast = opts2.fromBroadcast === true;

    if (!mountedRef.current) {
      console.log('[NotifDebug] Notification Skipped (component unmounted)');
      return;
    }

    var notif = normalizeNotif(rawNotif);
    var id    = getNotificationId(notif);
    var idStr = id != null ? String(id) : null;

    var type     = String(notif.type || notif.data?.type || '').toUpperCase();
    var orderId  = notif.orderId || notif.data?.orderId || null;
    var orderKey = orderId ? String(orderId) : null;

    console.log(
      '[NotifDebug] Order Event Received: id=' + idStr +
      ', type=' + type +
      ', orderId=' + orderId +
      ', alert=' + alert +
      ', fromBroadcast=' + fromBroadcast
    );

    // ── Notification-ID dedup ────────────────────────────────────────────────
    if (idStr && localSeenIds.current.has(idStr)) {
      console.log('[NotifDebug] Notification Skipped (already in localSeenIds): id=' + idStr);
      return;
    }
    if (idStr) localSeenIds.current.add(idStr);

    // ── Order-ID dedup (prevents socket + polling double-firing) ────────────
    if (orderKey && NEW_ORDER_TYPES.has(type)) {
      if (processedOrderIds.current.has(orderKey)) {
        console.log('[NotifDebug] Notification Skipped (orderId already processed): orderId=' + orderKey);
        return;
      }
      processedOrderIds.current.add(orderKey);
    }

    // ── Update in-memory list ────────────────────────────────────────────────
    localNotifsRef.current = [notif].concat(localNotifsRef.current).slice(0, 100);
    setNotifications(localNotifsRef.current.slice());

    if (onNotificationRef.current)    onNotificationRef.current(notif);
    if (onNewNotificationRef.current) onNewNotificationRef.current(notif);

    // ── Decide whether to alert (sound + desktop) ────────────────────────────
    // claimAlert is called for its logging and session-tracking side-effects,
    // but its return value no longer gates shouldAlert for socket events.
    // Reason: claimAlert previously used localStorage (ALERTED_IDS_KEY) which
    // persisted across page refreshes and caused legitimate socket events to be
    // silently blocked. Dedup is now handled by:
    //   1. localSeenIds (in-memory, per session) — blocks duplicate socket events
    //   2. processedOrderIds (in-memory, per session) — blocks duplicate orders
    //   3. DESKTOP_IDS_KEY in showDesktopNotification — blocks duplicate desktop per ID
    //   4. tryAcquireAudioLock — blocks duplicate sound across tabs
    var important = isImportantAdminNotification(notif);
    claimAlert(notif); // side-effect: logs + writes to session Set + localStorage
    var shouldAlert = alert && !fromBroadcast && important;

    console.log(
      '[NotifDebug] shouldAlert=' + shouldAlert +
      ' (alert=' + alert +
      ', fromBroadcast=' + fromBroadcast +
      ', important=' + important + ')'
    );

    if (shouldAlert) {
      // ALL important types — including NEW_ORDER — get sound + desktop from
      // the socket event.
      var content = buildDesktopNotificationContent(notif);
      var body    = content.body;

      playSound(idStr).then(function() {
        showDesktopNotification(body, {
          notification:   notif,
          notificationId: id,
          type:           type,
        });
      });

      if (onSoundTriggerRef.current) onSoundTriggerRef.current(notif);

      // Repeat sound every 10 s (up to MAX_ESCALATIONS) for NEW_ORDER
      if (NEW_ORDER_TYPES.has(type)) {
        startEscalation(notif);
      }

      setPermissionState(getPermissionState());
    } else {
      if (!important)     console.log('[NotifDebug] Notification Skipped (not important): type=' + type);
      if (fromBroadcast)  console.log('[NotifDebug] Notification Skipped (fromBroadcast, UI-only): id=' + idStr);
      if (!alert)         console.log('[NotifDebug] Notification Skipped (poll history-sync, alert=false): id=' + idStr);
    }

    rememberLastNotification(notif);
    lastIdRef.current   = getStoredLastNotificationId();
    lastTimeRef.current = getStoredLastNotificationTime();
  }, [playSound, startEscalation]);

  // ── Fetch & process (initial load + reconnect recovery + fallback poll) ────

  var fetchAndProcess = useCallback(async function(afterId, opts3) {
    // alertMissed: true  = reconnect recovery (missed real-time events)
    //              false = periodic poll, history sync only — no sound/desktop
    var alertMissed = opts3 ? !!opts3.alertMissed : false;
    try {
      var response = await getNotifications(afterId ? { after: afterId } : undefined);
      var docs = [];
      if      (Array.isArray(response.data && response.data.data))          docs = response.data.data;
      else if (Array.isArray(response.data && response.data.notifications)) docs = response.data.notifications;
      else if (Array.isArray(response.data))                                docs = response.data;
      if (!Array.isArray(docs)) docs = [];

      if (!initializedRef.current) {
        // Initial load — seed existing notification IDs into localSeenIds so
        // the 60 s poll never re-alerts them. BUT: do NOT seed IDs for very
        // recent notifications (< 2 min old). Those should still be alertable
        // by the real-time socket event that arrives shortly after page load.
        // Previous bug: ALL IDs were seeded, so the socket event for a fresh
        // order that happened to land in the initial fetch was silently dropped.
        var now        = Date.now();
        var RECENT_MS  = 120_000; // 2 minutes — match seedAlertedIds
        var docCount   = 0;
        var skipCount  = 0;
        docs.forEach(function(n) {
          var nid = getNotificationId(n);
          if (nid == null) return;

          var createdAt = n.createdAt || n.created_at || n.timestamp;
          var createdMs = createdAt ? Date.parse(createdAt) : null;
          var isVeryRecent = (createdMs != null) && (now - createdMs) < RECENT_MS;

          if (isVeryRecent) {
            // Leave out of localSeenIds — socket event can still claim + alert it
            skipCount++;
          } else {
            localSeenIds.current.add(String(nid));
            docCount++;
          }
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
        console.log(
          '[NotifDebug] Initial load: ' + docs.length + ' docs, seeded=' +
          docCount + ', skipped-recent=' + skipCount +
          ', lastId=' + lastIdRef.current
        );
        return;
      }

      // Subsequent call — only process genuinely new notifications
      var missed = docs.filter(function(n) {
        var nid = getNotificationId(n);
        if (nid == null) return false;
        if (localSeenIds.current.has(String(nid))) return false;
        if (afterId) return true; // server already filtered server-side
        return isNotificationNewer(n, lastIdRef.current, lastTimeRef.current);
      });

      console.log(
        '[NotifDebug] fetchAndProcess: ' + docs.length + ' docs, ' +
        missed.length + ' missed, afterId=' + afterId +
        ', alertMissed=' + alertMissed +
        ', lastId=' + lastIdRef.current
      );

      if (missed.length > 0) {
        missed.slice().sort(compareNotifs).forEach(function(n) {
          handleNewNotification(n, { alert: alertMissed });
        });
      }
    } catch (_e) {
      // non-fatal
    }
  }, [handleNewNotification]);

  // ── Setup / teardown ───────────────────────────────────────────────────────

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
                console.log('[NotifDebug] Sound Played (retry after unlock): id=' + queuedId);
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

    // Request permission on mount (will prompt the first time)
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      requestDesktopNotificationPermissionOnce()
        .then(function(perm) {
          console.log('[NotifDebug] Permission request resolved: ' + (perm || Notification.permission));
          setPermissionState(getPermissionState());
        })
        .catch(function(err) {
          console.log('[NotifDebug] Permission request error: ' + err);
        });
    }

    // Multi-tab sync: receive BC messages and update UI only (no sound/desktop)
    try {
      bcRef.current = new BroadcastChannel('admin_notifications');
      bcRef.current.onmessage = function(event) {
        if (!event.data || event.data.type !== 'new_notif') return;
        var raw = event.data.notification;
        if (!raw || !mountedRef.current) return;
        handleNewNotification(raw, { alert: true, fromBroadcast: true });
      };
    } catch (_e) {}

    // Initial fetch seeds alerted IDs — no desktop/sound
    fetchAndProcess();

    // Reconnect recovery: fetch missed notifications and alert them
    var unsubReconnect = onAdminReconnect(function() {
      console.log('[NotifDebug] Socket Reconnected');
      setTimeout(function() {
        fetchAndProcess(lastIdRef.current || undefined, { alertMissed: true });
      }, RECONNECT_FETCH_DELAY);
    });

    return function() {
      mountedRef.current = false;
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

  // ── Socket connection ──────────────────────────────────────────────────────

  var connectSocket = useCallback(function() {
    var socket = getAdminSocket();
    if (!socket) return;

    if (socketHandlersRef.current) {
      socket.off('connect',          socketHandlersRef.current.onConnect);
      socket.off('disconnect',       socketHandlersRef.current.onDisconnect);
      socket.off('new_notification', socketHandlersRef.current.onNewNotif);
      socket.off('notification:new', socketHandlersRef.current.onNewNotif);
      socket.off('order:new',        socketHandlersRef.current.onOrderNew);
      socket.off('order:update',     socketHandlersRef.current.onNewNotif);
    }

    var onConnect = function() {
      if (mountedRef.current) {
        console.log('[NotifDebug] Socket Connected');
        setSocketConnected(true);
      }
    };
    var onDisconnect = function() {
      if (mountedRef.current) setSocketConnected(false);
    };

    // order:new is the primary, dedicated handler for new order events.
    // It executes all 4 required actions: bell, list, desktop, sound.
    var onOrderNew = function(rawNotif) {
      console.log(
        '[NotifDebug] Order Event Received (order:new): orderId=' +
        (rawNotif?.orderId || rawNotif?.data?.orderId) +
        ', id=' + (rawNotif?.id || rawNotif?.notificationId)
      );
      handleNewNotification(rawNotif, { alert: true });
      try {
        if (bcRef.current) bcRef.current.postMessage({ type: 'new_notif', notification: rawNotif });
      } catch (_e) {}
    };

    // Generic handler for all other notification events
    var onNewNotif = function(rawNotif) {
      console.log(
        '[NotifDebug] Order Event Received (new_notification): id=' +
        (rawNotif?.id || rawNotif?.notificationId) +
        ' type=' + (rawNotif?.type || rawNotif?.data?.type)
      );
      handleNewNotification(rawNotif, { alert: true });
      try {
        if (bcRef.current) bcRef.current.postMessage({ type: 'new_notif', notification: rawNotif });
      } catch (_e) {}
    };

    socketHandlersRef.current = { onConnect, onDisconnect, onNewNotif, onOrderNew };

    if (socket.connected) {
      console.log('[NotifDebug] Socket Connected (already connected on mount)');
      setSocketConnected(true);
    }
    socket.on('connect',          onConnect);
    socket.on('disconnect',       onDisconnect);
    // order:new is the dedicated high-priority event for new orders
    socket.on('order:new',        onOrderNew);
    // new_notification and notification:new carry all other notification types
    socket.on('new_notification', onNewNotif);
    socket.on('notification:new', onNewNotif);
    socket.on('order:update',     onNewNotif);
    console.log('order:new listener registered on socket', socket.id || '(connecting)');
  }, [handleNewNotification]);

  useEffect(function() {
    connectSocket();

    function schedulePoll() {
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      var socketUp = isAdminSocketConnected();
      var interval = socketUp ? FALLBACK_POLL_INTERVAL : DISCONNECTED_POLL_INTERVAL;
      fallbackTimerRef.current = setInterval(function() {
        var connected = isAdminSocketConnected();
        // When socket is down, poll faster and alert on newly discovered notifications
        fetchAndProcess(undefined, { alertMissed: !connected });
      }, interval);
    }

    schedulePoll();

    // Re-schedule poll interval when socket connects/disconnects
    var socket = getAdminSocket();
    var onConnChange = function() { schedulePoll(); };
    if (socket) {
      socket.on('connect', onConnChange);
      socket.on('disconnect', onConnChange);
    }

    return function() {
      if (socket) {
        socket.off('connect', onConnChange);
        socket.off('disconnect', onConnChange);
      }
      if (socket && socketHandlersRef.current) {
        socket.off('connect',          socketHandlersRef.current.onConnect);
        socket.off('disconnect',       socketHandlersRef.current.onDisconnect);
        socket.off('new_notification', socketHandlersRef.current.onNewNotif);
        socket.off('notification:new', socketHandlersRef.current.onNewNotif);
        socket.off('order:new',        socketHandlersRef.current.onOrderNew);
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
