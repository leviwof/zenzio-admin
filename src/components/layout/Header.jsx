import React, { useRef, useMemo, useCallback } from 'react';
import { Menu, Bell, LogOut, Check, ShoppingBag, XCircle, Truck, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationAsRead } from '../../services/api';
import { useOrderNotifications } from '../../context/OrderNotificationContext';
const notificationSound = `${import.meta.env.BASE_URL}notification.mp3`;

const isToday = (dateStr) => {
  if (!dateStr) return false;
  try {
    const now = new Date();
    const date = new Date(dateStr);
    return date.toDateString() === now.toDateString();
  } catch { return false; }
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return ''; }
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
    return { icon: ShoppingBag, label: 'New Order', iconClass: 'text-green-600', bgClass: 'bg-green-50', borderClass: 'border-l-green-500' };
  }

  const text = `${title || ''} ${body || ''}`.toLowerCase();

  if (text.includes('new') && (text.includes('order') || text.includes('booking') || text.includes('placed'))) {
    return { icon: ShoppingBag, label: 'New Order', iconClass: 'text-green-600', bgClass: 'bg-green-50', borderClass: 'border-l-green-500' };
  }
  if (text.includes('cancel')) {
    return { icon: XCircle, label: 'Cancelled', iconClass: 'text-red-500', bgClass: 'bg-red-50', borderClass: 'border-l-red-400' };
  }
  if (text.includes('deliver') || text.includes('picked') || text.includes('out for') || text.includes('on the way') || text.includes('assigned')) {
    return { icon: Truck, label: 'Delivery Update', iconClass: 'text-orange-500', bgClass: 'bg-orange-50', borderClass: 'border-l-orange-400' };
  }
  if (text.includes('refund') || text.includes('payment') || text.includes('issue') || text.includes('failed') || text.includes('error')) {
    return { icon: AlertTriangle, label: 'Alert', iconClass: 'text-purple-500', bgClass: 'bg-purple-50', borderClass: 'border-l-purple-400' };
  }
  if (text.includes('order') || text.includes('booking')) {
    return { icon: ShoppingBag, label: 'Order Update', iconClass: 'text-indigo-500', bgClass: 'bg-indigo-50', borderClass: 'border-l-indigo-400' };
  }
  return { icon: Bell, label: 'Notification', iconClass: 'text-gray-500', bgClass: 'bg-gray-50', borderClass: 'border-l-gray-300' };
};

const extractOrderId = (notif) => {
  if (!notif) return null;

  if (notif.orderId || notif.order_id) return notif.orderId || notif.order_id;
  if (notif.targetId || notif.targetUid) return notif.targetId || notif.targetUid;
  if (notif.data?.orderId || notif.data?.order_id) return notif.data.orderId || notif.data.order_id;
  if (notif.metadata?.orderId || notif.metadata?.order_id) return notif.metadata.orderId || notif.metadata.order_id;

  const text = `${notif.title || ''} ${notif.body || ''}`;
  const patterns = [
    /#([A-Z0-9_-]{5,})/i,
    /\border\s*(?:id)?\s*[#:]\s*([A-Z0-9]{5,})/i,
    /\b(ORD[A-Z0-9]{3,})/i,
    /\b([A-F0-9]{24})\b/i,
    /([a-z0-9]{20,})/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[1];
  }
  return null;
};

const Header = ({ onToggleSidebar, onLogout }) => {
  const navigate = useNavigate();
  const [allNotifications, setAllNotifications] = React.useState([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const knownUnreadIds = useRef(new Set());
  const knownSyntheticIds = useRef(new Set());
  const isInitialLoad = useRef(true);
  const audioRef = useRef(null);
  const audioUnlocked = useRef(false);
  const { unreadOrderCount, syntheticNotifs, markSyntheticNotifRead } = useOrderNotifications();
  const [badgeAnim, setBadgeAnim] = React.useState(false);
  const dropdownRef = useRef(null);

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

  const displayNotifications = useMemo(() => {
    return allMergedNotifications.slice(0, 30);
  }, [allMergedNotifications]);

  const todayUnreadCount = useMemo(() => {
    const count = allMergedNotifications.filter(n => !n.isRead && isToday(n.createdAt)).length;
    return count;
  }, [allMergedNotifications]);

  React.useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    audioRef.current.preload = 'auto';
    const unlock = () => {
      if (!audioUnlocked.current) {
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioUnlocked.current = true;
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
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

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && audioUnlocked.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch (e) {
        console.warn('[Header Sound] error:', e);
      }
    }
  }, []);

  React.useEffect(() => {
    const unreadSynthetic = syntheticNotifs.filter(n => !n.isRead);
    const newSynthIds = unreadSynthetic
      .map(n => n.id)
      .filter(id => !knownSyntheticIds.current.has(id));

    if (newSynthIds.length > 0 && !isInitialLoad.current) {
      playNotificationSound();
    }
    unreadSynthetic.forEach(n => knownSyntheticIds.current.add(n.id));
  }, [syntheticNotifs, playNotificationSound]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      let docs = [];
      if (Array.isArray(response.data?.data)) {
        docs = response.data.data;
      } else if (Array.isArray(response.data?.notifications)) {
        docs = response.data.notifications;
      } else if (Array.isArray(response.data)) {
        docs = response.data;
      } else if (response.data?.data && typeof response.data.data === 'object') {
        docs = response.data.data.data || Object.values(response.data.data);
      }

      const docsList = Array.isArray(docs) ? docs : [];

      const unreadAll = docsList.filter(n => !n.isRead);
      const unreadIds = new Set(unreadAll.map(n => n.id));

      const hasNewUnread = [...unreadIds].some(id => !knownUnreadIds.current.has(id));

      if (!isInitialLoad.current && hasNewUnread) {
        playNotificationSound();
      }
      isInitialLoad.current = false;
      knownUnreadIds.current = unreadIds;

      setAllNotifications(docsList);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [playNotificationSound]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  React.useEffect(() => {
    if (unreadOrderCount > 0) {
      setBadgeAnim(true);
      const t = setTimeout(() => setBadgeAnim(false), 300);
      return () => clearTimeout(t);
    }
  }, [unreadOrderCount]);

  const handleOrderBadgeClick = useCallback(() => {
    navigate('/orders');
  }, [navigate]);

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

    if (orderId) {
      navigate(`/orders/${orderId}`);
    } else {
      navigate('/orders');
    }
    setShowDropdown(false);
  }, [navigate, markSyntheticNotifRead]);

  const listenForEsc = useCallback((e) => {
    if (e.key === 'Escape') setShowDropdown(false);
  }, []);

  React.useEffect(() => {
    document.addEventListener('keydown', listenForEsc);
    return () => document.removeEventListener('keydown', listenForEsc);
  }, [listenForEsc]);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <button onClick={onToggleSidebar} className="text-gray-600 hover:text-gray-900">
        <Menu size={24} />
      </button>

      <div className="flex items-center space-x-4">
        {unreadOrderCount > 0 && (
          <button
            onClick={handleOrderBadgeClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 hover:bg-red-100 transition-all ${badgeAnim ? 'animate-badge-pop' : ''}`}
            title="View new orders"
          >
            <ShoppingBag size={14} className="text-red-500" />
            <span className="text-xs font-bold text-red-600">{unreadOrderCount} New Order{unreadOrderCount > 1 ? 's' : ''}</span>
          </button>
        )}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(prev => !prev)}
            className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${showDropdown ? 'bg-gray-100' : ''}`}
            aria-label="Notifications"
          >
            <Bell size={20} className="text-gray-600" />
            {todayUnreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold leading-none">
                {todayUnreadCount > 9 ? '9+' : todayUnreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-gray-600" />
                  <span className="font-bold text-sm text-gray-800">Notifications</span>
                </div>
                {todayUnreadCount > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {todayUnreadCount} New
                  </span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {displayNotifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                      <Bell size={20} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No new notifications today</p>
                    <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  displayNotifications.map((notif) => {
                    const isUnread = !notif.isRead;
                    const meta = getNotificationMeta(notif.title, notif.body, notif.type);
                    const Icon = meta.icon;
                    const orderId = extractOrderId(notif);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`
                          px-4 py-3 border-b border-gray-50 cursor-pointer
                          transition-all duration-150
                          ${isUnread ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-gray-50'}
                          border-l-[3px] ${meta.borderClass}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${meta.bgClass} flex items-center justify-center`}>
                            <Icon size={15} className={meta.iconClass} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-500'}`}>
                                {notif.title || meta.label}
                              </p>
                              {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                            </div>
                            {notif.body && (
                              <p className={`text-xs mt-0.5 line-clamp-2 ${isUnread ? 'text-gray-600' : 'text-gray-400'}`}>
                                {notif.body}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {orderId && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-100 text-[10px] font-mono font-bold text-red-600">
                                  <ShoppingBag size={9} />
                                  #{orderId.length > 12 ? orderId.slice(0, 12) + '...' : orderId}
                                </span>
                              )}
                              <span
                                className="text-[10px] text-gray-400"
                                title={formatFullTimestamp(notif.createdAt)}
                              >
                                <Clock size={10} className="inline mr-0.5" />
                                {formatFullTimestamp(notif.createdAt)}
                              </span>
                              {orderId && (
                                <span className="text-[10px] text-red-400 ml-auto flex items-center gap-0.5 font-medium">
                                  View order
                                  <ExternalLink size={9} />
                                </span>
                              )}
                            </div>
                          </div>
                          {isUnread && (
                            <button
                              onClick={(e) => handleMarkAsRead(e, notif.id)}
                              className="flex-shrink-0 p-1 mt-0.5 rounded text-gray-300 hover:text-green-500 hover:bg-green-50 transition-colors"
                              title="Mark as read"
                            >
                              <Check size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-center">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/activity-log');
                  }}
                  className="text-[11px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest"
                >
                  View All Activity
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="font-medium">Admin</span>
        </div>

        <button
          onClick={onLogout}
          className="text-gray-600 hover:text-red-500 flex items-center space-x-1"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
