import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, LogOut, Search, ChevronDown,
  ShoppingBag, Check, Clock, ExternalLink,
  XCircle, Truck, AlertTriangle, Settings as SettingsIcon,
  Circle, Activity, Users, Store,
} from 'lucide-react';
import { getNotifications, getRestaurantById, markNotificationAsRead, getRestaurantStats, getOrderStats } from '../../services/api';
import { useOrderNotifications } from '../../context/OrderNotificationContext';
import { getAuthUser, getCurrentRestaurantUid, isRestaurantAdmin } from '../../utils/auth';

const notificationSoundPath = `${import.meta.env.BASE_URL}notification.mp3`;

const isToday = (dateStr) => {
  if (!dateStr) return false;
  try { return new Date(dateStr).toDateString() === new Date().toDateString(); }
  catch { return false; }
};

const formatFullTimestamp = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return ''; }
};

const getNotificationMeta = (title, body, type) => {
  if (type === "NEW_ORDER") {
    return { icon: ShoppingBag, label: 'New Order', iconClass: 'text-emerald-600', bgClass: 'bg-emerald-50', borderClass: 'border-l-emerald-500' };
  }
  const text = `${title || ''} ${body || ''}`.toLowerCase();
  if (text.includes('new') && (text.includes('order') || text.includes('booking')))
    return { icon: ShoppingBag, label: 'New Order', iconClass: 'text-emerald-600', bgClass: 'bg-emerald-50', borderClass: 'border-l-emerald-500' };
  if (text.includes('cancel'))
    return { icon: XCircle, label: 'Cancelled', iconClass: 'text-red-500', bgClass: 'bg-red-50', borderClass: 'border-l-red-400' };
  if (text.includes('deliver') || text.includes('out for'))
    return { icon: Truck, label: 'Delivery Update', iconClass: 'text-orange-500', bgClass: 'bg-orange-50', borderClass: 'border-l-orange-400' };
  if (text.includes('refund') || text.includes('failed') || text.includes('error'))
    return { icon: AlertTriangle, label: 'Alert', iconClass: 'text-purple-500', bgClass: 'bg-purple-50', borderClass: 'border-l-purple-400' };
  return { icon: Bell, label: 'Notification', iconClass: 'text-gray-500', bgClass: 'bg-gray-50', borderClass: 'border-l-gray-300' };
};

const extractOrderId = (notif) => {
  if (!notif) return null;
  if (notif.orderId || notif.order_id) return notif.orderId || notif.order_id;
  if (notif.targetId || notif.targetUid) return notif.targetId || notif.targetUid;
  if (notif.data?.orderId) return notif.data.orderId;
  const text = `${notif.title || ''} ${notif.body || ''}`;
  const m = text.match(/#([A-Z0-9_-]{5,})/i);
  return m ? m[1] : null;
};

// ─── Clock Digit ──────────────────────────────────────
const ClockDigit = ({ value, label }) => {
  const display = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="relative overflow-hidden">
        <motion.span
          key={display}
          initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight text-gray-900"
        >
          {display}
        </motion.span>
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">{label}</span>
    </div>
  );
};

// ─── Stat Widget ──────────────────────────────────────
const StatWidget = ({ icon: Icon, label, value, color, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/60 border border-gray-100/80 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      {loading ? (
        <div className="w-4 h-4 rounded bg-white/40 animate-pulse" />
      ) : (
        <Icon size={16} />
      )}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 group-hover:text-gray-500 transition-colors">{label}</p>
      {loading ? (
        <div className="h-4 w-10 bg-gray-200 rounded animate-pulse mt-0.5" />
      ) : (
        <p className="text-sm font-bold text-gray-800 tabular-nums">{value}</p>
      )}
    </div>
  </motion.div>
);

// ─── System Status Badge ──────────────────────────────
const SystemStatusBadge = ({ status }) => {
  const configs = {
    operational: { dot: 'bg-emerald-500', bg: 'bg-emerald-50/80 border-emerald-200/60', text: 'text-emerald-700', label: 'System Operational' },
    warning: { dot: 'bg-amber-500', bg: 'bg-amber-50/80 border-amber-200/60', text: 'text-amber-700', label: 'Degraded' },
    error: { dot: 'bg-red-500', bg: 'bg-red-50/80 border-red-200/60', text: 'text-red-700', label: 'Issues Detected' },
  };
  const c = configs[status] || configs.operational;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${c.bg} ${c.text}`}
    >
      <span className={`relative flex h-2.5 w-2.5`}>
        <span className={`animate-ping absolute inset-0 rounded-full ${c.dot} opacity-40`} />
        <span className={`relative rounded-full h-2.5 w-2.5 ${c.dot}`} />
      </span>
      <span className="text-[11px] font-semibold whitespace-nowrap">{c.label}</span>
    </motion.div>
  );
};

// ─── Main Header ─────────────────────────────────────
const Header = ({ onLogout }) => {
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();

  // ── Clock ──
  const [clock, setClock] = useState({ time: '', period: '', day: '', date: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setClock({
        time: `${String(h).padStart(2, '0')}:${m}`,
        seconds: s,
        period,
        day: now.toLocaleDateString('en-US', { weekday: 'long' }),
        date: now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      });
    };
    update();
    setMounted(true);
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Operational Stats ──
  const [stats, setStats] = useState({ restaurantsOnline: null, activeOrders: null, ridersOnline: null });
  const [statsLoading, setStatsLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState('operational');

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setStatsLoading(true);
      try {
        const [restResp, orderResp] = await Promise.allSettled([
          getRestaurantStats(),
          getOrderStats(),
        ]);
        if (cancelled) return;
        let restaurantsOnline = null;
        let activeOrders = null;

        if (restResp.status === 'fulfilled') {
          const data = restResp.value.data?.data || restResp.value.data || {};
          restaurantsOnline = data.activeCount ?? data.active ?? null;
        }

        if (orderResp.status === 'fulfilled') {
          const data = orderResp.value.data?.data || orderResp.value.data || {};
          activeOrders = data.activeCount ?? data.active ?? data.pending ?? null;
        }

        setStats({ restaurantsOnline, activeOrders, ridersOnline: null });
      } catch {
        // Silent
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    fetch();
    const t = setInterval(fetch, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // ── Notifications ──
  const [allNotifications, setAllNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [displayName, setDisplayName] = useState('Admin');
  const [displayInitial, setDisplayInitial] = useState('A');
  const knownUnreadIds = useRef(new Set());
  const knownSyntheticIds = useRef(new Set());
  const isInitialLoad = useRef(true);
  const audioRef = useRef(null);
  const audioUnlocked = useRef(false);
  const { unreadOrderCount, syntheticNotifs, markSyntheticNotifRead } = useOrderNotifications();
  const [badgeAnim, setBadgeAnim] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadIdentity = async () => {
      if (!restaurantAdmin) {
        const authUser = getAuthUser();
        const name = authUser?.name || localStorage.getItem('adminEmail') || 'Admin';
        if (!cancelled) { setDisplayName('Admin'); setDisplayInitial(name.charAt(0).toUpperCase()); }
        return;
      }
      const restaurantUid = getCurrentRestaurantUid();
      if (!restaurantUid) return;
      try {
        const response = await getRestaurantById(restaurantUid);
        const restaurant = response.data?.data?.restaurant || response.data?.restaurant || response.data?.data || {};
        const name = restaurant.profile?.restaurant_name || restaurant.restaurant_name || restaurant.name || 'Restaurant Admin';
        if (!cancelled) { setDisplayName(name); setDisplayInitial(name.charAt(0).toUpperCase()); }
      } catch {
        const fallback = getAuthUser()?.name || 'Restaurant Admin';
        if (!cancelled) { setDisplayName(fallback); setDisplayInitial(fallback.charAt(0).toUpperCase()); }
      }
    };
    loadIdentity();
    return () => { cancelled = true; };
  }, [restaurantAdmin]);

  const allMergedNotifications = useMemo(() => {
    const apiItems = allNotifications.map(n => ({ ...n, _source: 'api' }));
    const syntheticItems = syntheticNotifs.map(n => ({ ...n, _source: 'synthetic' }));
    return [...apiItems, ...syntheticItems].sort((a, b) => {
      const aToday = isToday(a.createdAt);
      const bToday = isToday(b.createdAt);
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [allNotifications, syntheticNotifs]);

  const displayNotifications = useMemo(() => allMergedNotifications.slice(0, 30), [allMergedNotifications]);
  const todayUnreadCount = useMemo(() => allMergedNotifications.filter(n => !n.isRead && isToday(n.createdAt)).length, [allMergedNotifications]);

  useEffect(() => {
    audioRef.current = new Audio(notificationSoundPath);
    audioRef.current.preload = 'auto';
    const unlock = () => {
      if (!audioUnlocked.current) {
        audioRef.current.play().then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; audioUnlocked.current = true; }).catch(() => {});
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    return () => { document.removeEventListener('click', unlock); document.removeEventListener('touchstart', unlock); };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { setShowDropdown(false); setShowProfileMenu(false); setShowSearch(false); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 100); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && audioUnlocked.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
  }, []);

  useEffect(() => {
    const unreadSynthetic = syntheticNotifs.filter(n => !n.isRead);
    const newSynthIds = unreadSynthetic.map(n => n.id).filter(id => !knownSyntheticIds.current.has(id));
    if (newSynthIds.length > 0 && !isInitialLoad.current) playNotificationSound();
    unreadSynthetic.forEach(n => knownSyntheticIds.current.add(n.id));
  }, [syntheticNotifs, playNotificationSound]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      let docs = [];
      if (Array.isArray(response.data?.data)) docs = response.data.data;
      else if (Array.isArray(response.data?.notifications)) docs = response.data.notifications;
      else if (Array.isArray(response.data)) docs = response.data;
      const docsList = Array.isArray(docs) ? docs : [];
      const unreadAll = docsList.filter(n => !n.isRead);
      const unreadIds = new Set(unreadAll.map(n => n.id));
      const hasNewUnread = [...unreadIds].some(id => !knownUnreadIds.current.has(id));
      if (!isInitialLoad.current && hasNewUnread) playNotificationSound();
      isInitialLoad.current = false;
      knownUnreadIds.current = unreadIds;
      setAllNotifications(docsList);
    } catch (error) { console.error('Failed to fetch notifications:', error); }
  }, [playNotificationSound]);

  useEffect(() => { fetchNotifications(); const interval = setInterval(fetchNotifications, 15000); return () => clearInterval(interval); }, [fetchNotifications]);

  useEffect(() => {
    if (unreadOrderCount > 0) { setBadgeAnim(true); const t = setTimeout(() => setBadgeAnim(false), 300); return () => clearTimeout(t); }
  }, [unreadOrderCount]);

  const handleMarkAsRead = useCallback(async (e, id) => {
    e.stopPropagation();
    if (id.startsWith('syn_')) { markSyntheticNotifRead(id); knownSyntheticIds.current.delete(id); }
    else {
      try {
        await markNotificationAsRead(id);
        setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        knownUnreadIds.current.delete(id);
      } catch (error) { console.error('Failed to mark notification as read:', error); }
    }
  }, [markSyntheticNotifRead]);

  const handleNotificationClick = useCallback(async (notif) => {
    if (!notif.isRead) {
      if (notif._source === 'synthetic' || notif.id.startsWith('syn_')) { markSyntheticNotifRead(notif.id); knownSyntheticIds.current.delete(notif.id); }
      else {
        try {
          await markNotificationAsRead(notif.id);
          setAllNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
          knownUnreadIds.current.delete(notif.id);
        } catch (error) { console.error('Failed to mark notification as read:', error); }
      }
    }
    const orderId = extractOrderId(notif);
    navigate(orderId ? `/orders/${orderId}` : '/orders');
    setShowDropdown(false);
  }, [navigate, markSyntheticNotifRead]);

  const clockLoading = !mounted || !clock.time;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-gray-200/60 shadow-sm shadow-gray-200/20"
    >
      <div className="flex items-center justify-between h-auto min-h-[64px] px-3 md:px-5 py-2 gap-3">
        {/* ── Left: Clock + Operational Stats ── */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Live Clock */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative flex items-center gap-4 px-4 py-2 rounded-2xl bg-gradient-to-br from-white via-white to-indigo-50/30 border border-gray-100/80 shadow-sm hover:shadow-md transition-all duration-300 group"
          >
            {/* Glow accent */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Pulsing live dot */}
            <div className="relative flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-60" />
                <span className="relative rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-600 hidden sm:inline">Live</span>
            </div>

            {/* Time display */}
            <div className="flex items-center gap-2.5">
              {clockLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-8 w-12 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <ClockDigit value={clock.time.split(':')[0]} label="Hr" />
                    <motion.span
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="text-2xl md:text-3xl font-bold text-gray-300 -mt-5"
                    >:</motion.span>
                    <ClockDigit value={clock.time.split(':')[1]} label="Min" />
                    <motion.span
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="text-2xl md:text-3xl font-bold text-gray-300 -mt-5"
                    >:</motion.span>
                    <ClockDigit value={clock.seconds} label="Sec" />
                  </div>
                  <div className="flex flex-col items-start pl-2 border-l border-gray-100 ml-1">
                    <motion.span
                      key={clock.period}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-[11px] font-bold tracking-wider text-indigo-600 uppercase"
                    >
                      {clock.period}
                    </motion.span>
                    <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">IST</span>
                  </div>
                </>
              )}
            </div>

            {/* Date + Day */}
            {!clockLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="hidden sm:flex flex-col items-start pl-3 border-l border-gray-100"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{clock.day}</span>
                <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{clock.date}</span>
              </motion.div>
            )}
          </motion.div>

          {/* Operational Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="hidden lg:flex items-center gap-2"
          >
            <StatWidget
              icon={ShoppingBag}
              label="Active Orders"
              value={stats.activeOrders ?? '—'}
              color="bg-emerald-50 text-emerald-600"
              loading={statsLoading}
            />
            <StatWidget
              icon={Users}
              label="Riders Online"
              value={stats.ridersOnline ?? '—'}
              color="bg-blue-50 text-blue-600"
              loading={statsLoading}
            />
            <StatWidget
              icon={Store}
              label="Restaurants Live"
              value={stats.restaurantsOnline ?? '—'}
              color="bg-violet-50 text-violet-600"
              loading={statsLoading}
            />
            <SystemStatusBadge status={systemStatus} />
          </motion.div>

          {/* Mobile date fallback */}
          {!clockLoading && (
            <div className="flex sm:hidden items-center ml-auto">
              <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{clock.day}, {clock.date}</span>
            </div>
          )}
        </div>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Search */}
          <AnimatePresence>
            {showSearch ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden sm:block"
              >
                <div className="relative">
                  <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery) setShowSearch(false); }}
                    placeholder="Search orders, restaurants..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSearch(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 bg-gray-100/80 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-all"
              >
                <Search size={15} />
                <kbd className="text-[9px] text-gray-400 bg-white border border-gray-200 rounded px-1 py-0.5 font-medium">⌘K</kbd>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Order badge */}
          {unreadOrderCount > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => navigate('/orders')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all ${badgeAnim ? 'animate-badge-pop' : ''}`}
            >
              <ShoppingBag size={13} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 tabular-nums">{unreadOrderCount}</span>
            </motion.button>
          )}

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bell size={18} className="text-gray-500" />
              {todayUnreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold"
                >
                  {todayUnreadCount > 9 ? '9+' : todayUnreadCount}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-gray-600" />
                      <span className="font-semibold text-sm text-gray-800">Notifications</span>
                    </div>
                    {todayUnreadCount > 0 && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">{todayUnreadCount} new</span>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {displayNotifications.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Bell size={18} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No notifications</p>
                        <p className="text-xs text-gray-400 mt-0.5">You're all caught up!</p>
                      </div>
                    ) : (
                      displayNotifications.map((notif) => {
                        const isUnread = !notif.isRead;
                        const meta = getNotificationMeta(notif.title, notif.body, notif.type);
                        const Icon = meta.icon;
                        const orderId = extractOrderId(notif);
                        return (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => handleNotificationClick(notif)}
                            className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-all duration-150 border-l-[3px] ${meta.borderClass} ${isUnread ? 'bg-indigo-50/30 hover:bg-indigo-50/60' : 'hover:bg-gray-50'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-xl ${meta.bgClass} flex items-center justify-center`}>
                                <Icon size={15} className={meta.iconClass} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-xs font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {notif.title || meta.label}
                                  </p>
                                  {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                                </div>
                                {notif.body && (
                                  <p className={`text-xs mt-0.5 line-clamp-2 ${isUnread ? 'text-gray-600' : 'text-gray-400'}`}>{notif.body}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5">
                                  {orderId && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-100 text-[9px] font-mono font-bold text-red-600">
                                      <ShoppingBag size={8} />
                                      #{orderId.length > 10 ? orderId.slice(0, 10) + '..' : orderId}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-400">
                                    <Clock size={9} className="inline mr-0.5" />
                                    {formatFullTimestamp(notif.createdAt)}
                                  </span>
                                </div>
                              </div>
                              {isUnread && (
                                <button onClick={(e) => handleMarkAsRead(e, notif.id)}
                                  className="flex-shrink-0 p-1 rounded text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                                >
                                  <Check size={13} />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-center">
                    <button onClick={() => { setShowDropdown(false); navigate('/activity-log'); }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                    >
                      View All Activity
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative" ref={profileMenuRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {displayInitial}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate hidden sm:block">{displayName}</span>
              <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
            </motion.button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                >
                  <div className="p-2">
                    <button onClick={() => { setShowProfileMenu(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <SettingsIcon size={16} />
                      Settings
                    </button>
                    <button onClick={onLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
