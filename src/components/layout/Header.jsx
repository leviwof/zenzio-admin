import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, LogOut, Search, ChevronDown,
  ShoppingBag, Check, Clock, ExternalLink,
  XCircle, Truck, AlertTriangle, Settings as SettingsIcon
} from 'lucide-react';
import { getNotifications, getRestaurantById, markNotificationAsRead } from '../../services/api';
import { useOrderNotifications } from '../../context/OrderNotificationContext';
import { getAuthUser, getCurrentRestaurantUid, isRestaurantAdmin } from '../../utils/auth';

const notificationSoundPath = `${import.meta.env.BASE_URL}notification.mp3`;

const isToday = (dateStr) => {
  if (!dateStr) return false;
  try {
    return new Date(dateStr).toDateString() === new Date().toDateString();
  } catch { return false; }
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
  if (text.includes('new') && (text.includes('order') || text.includes('booking'))) {
    return { icon: ShoppingBag, label: 'New Order', iconClass: 'text-emerald-600', bgClass: 'bg-emerald-50', borderClass: 'border-l-emerald-500' };
  }
  if (text.includes('cancel')) {
    return { icon: XCircle, label: 'Cancelled', iconClass: 'text-red-500', bgClass: 'bg-red-50', borderClass: 'border-l-red-400' };
  }
  if (text.includes('deliver') || text.includes('out for')) {
    return { icon: Truck, label: 'Delivery Update', iconClass: 'text-orange-500', bgClass: 'bg-orange-50', borderClass: 'border-l-orange-400' };
  }
  if (text.includes('refund') || text.includes('failed') || text.includes('error')) {
    return { icon: AlertTriangle, label: 'Alert', iconClass: 'text-purple-500', bgClass: 'bg-purple-50', borderClass: 'border-l-purple-400' };
  }
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

const Header = ({ onLogout }) => {
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();
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
        if (!cancelled) {
          setDisplayName('Admin');
          setDisplayInitial(name.charAt(0).toUpperCase());
        }
        return;
      }
      const restaurantUid = getCurrentRestaurantUid();
      if (!restaurantUid) return;
      try {
        const response = await getRestaurantById(restaurantUid);
        const restaurant = response.data?.data?.restaurant || response.data?.restaurant || response.data?.data || {};
        const name = restaurant.profile?.restaurant_name || restaurant.restaurant_name || restaurant.name || 'Restaurant Admin';
        if (!cancelled) {
          setDisplayName(name);
          setDisplayInitial(name.charAt(0).toUpperCase());
        }
      } catch {
        const fallback = getAuthUser()?.name || 'Restaurant Admin';
        if (!cancelled) {
          setDisplayName(fallback);
          setDisplayInitial(fallback.charAt(0).toUpperCase());
        }
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
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioUnlocked.current = true;
        }).catch(() => {});
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
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
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setShowProfileMenu(false);
        setShowSearch(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && audioUnlocked.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
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
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [playNotificationSound]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (unreadOrderCount > 0) {
      setBadgeAnim(true);
      const t = setTimeout(() => setBadgeAnim(false), 300);
      return () => clearTimeout(t);
    }
  }, [unreadOrderCount]);

  const handleMarkAsRead = useCallback(async (e, id) => {
    e.stopPropagation();
    if (id.startsWith('syn_')) {
      markSyntheticNotifRead(id);
      knownSyntheticIds.current.delete(id);
    } else {
      try {
        await markNotificationAsRead(id);
        setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        knownUnreadIds.current.delete(id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  }, [markSyntheticNotifRead]);

  const handleNotificationClick = useCallback(async (notif) => {
    if (!notif.isRead) {
      if (notif._source === 'synthetic' || notif.id.startsWith('syn_')) {
        markSyntheticNotifRead(notif.id);
        knownSyntheticIds.current.delete(notif.id);
      } else {
        try {
          await markNotificationAsRead(notif.id);
          setAllNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
          knownUnreadIds.current.delete(notif.id);
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      }
    }
    const orderId = extractOrderId(notif);
    navigate(orderId ? `/orders/${orderId}` : '/orders');
    setShowDropdown(false);
  }, [navigate, markSyntheticNotifRead]);

  return (
    <header className="sticky top-0 z-40 glass border-b border-gray-200/60">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {showSearch ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery) setShowSearch(false); }}
                    placeholder="Search orders, restaurants..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                  />
                  <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 hidden sm:inline">
                    ⌘K
                  </kbd>
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSearch(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                <Search size={16} />
                <span>Search...</span>
                <kbd className="text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 ml-6">⌘K</kbd>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {unreadOrderCount > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => navigate('/orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all ${badgeAnim ? 'animate-badge-pop' : ''}`}
            >
              <ShoppingBag size={14} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">{unreadOrderCount}</span>
            </motion.button>
          )}

          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bell size={20} className="text-gray-600" />
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
                      <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                        {todayUnreadCount} new
                      </span>
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
                            className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-all duration-150 border-l-[3px] ${meta.borderClass} ${
                              isUnread ? 'bg-indigo-50/30 hover:bg-indigo-50/60' : 'hover:bg-gray-50'
                            }`}
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
                                  <p className={`text-xs mt-0.5 line-clamp-2 ${isUnread ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {notif.body}
                                  </p>
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
                                <button
                                  onClick={(e) => handleMarkAsRead(e, notif.id)}
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
                    <button
                      onClick={() => { setShowDropdown(false); navigate('/activity-log'); }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                    >
                      View All Activity
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" ref={profileMenuRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {displayInitial}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate hidden sm:block">{displayName}</span>
              <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
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
                    <button
                      onClick={() => { setShowProfileMenu(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <SettingsIcon size={16} />
                      Settings
                    </button>
                    <button
                      onClick={onLogout}
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
    </header>
  );
};

export default Header;
