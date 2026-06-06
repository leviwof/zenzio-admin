import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShoppingBag, XCircle, Truck, AlertTriangle, Bell, X, ExternalLink,
  CheckCircle, RotateCcw, Store, User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 1; // show only the latest notification popup at a time

function getPopupMeta(type = '', title = '', body = '') {
  const t = type.toUpperCase();
  const text = `${title} ${body}`.toLowerCase();

  if (t === 'NEW_ORDER' || t === 'ORDER_RECEIVED')
    return { icon: ShoppingBag, bg: 'bg-emerald-500', label: 'New Order', accent: 'border-emerald-400' };
  if (t === 'ORDER_CANCELLED' || t === 'ORDER_CANCELED' || t === 'CANCELLED' || t === 'DELIVERY_CANCELLED' || t === 'DELIVERY_CANCELLED_ADMIN')
    return { icon: XCircle, bg: 'bg-red-500', label: 'Cancelled', accent: 'border-red-400' };
  if (t === 'ORDER_DELIVERED' || t === 'ORDER_OUT_FOR_DELIVERY' || t === 'ORDER_PICKED_UP')
    return { icon: Truck, bg: 'bg-blue-500', label: 'Delivery', accent: 'border-blue-400' };
  if (t === 'NEW_RESTAURANT_REGISTRATION')
    return { icon: Store, bg: 'bg-violet-500', label: 'New Restaurant', accent: 'border-violet-400' };
  if (t === 'NEW_PARTNER_REGISTRATION' || t === 'NEW_DELIVERY_ASSIGNED' || t === 'PARTNER_ACCEPTED')
    return { icon: User, bg: 'bg-orange-500', label: 'Delivery Partner', accent: 'border-orange-400' };
  if (t === 'STATUS_CHANGED' || t === 'ORDER_REASSIGNED' || t === 'DELIVERY_STATUS_CHANGED_ADMIN')
    return { icon: RotateCcw, bg: 'bg-amber-500', label: 'Status Update', accent: 'border-amber-400' };
  if (t === 'ORDER_ASSIGNED' || t === 'DELIVERY_ASSIGNED')
    return { icon: CheckCircle, bg: 'bg-teal-500', label: 'Assigned', accent: 'border-teal-400' };
  if (text.includes('cancel'))
    return { icon: XCircle, bg: 'bg-red-500', label: 'Cancelled', accent: 'border-red-400' };
  if (text.includes('deliver') || text.includes('picked up'))
    return { icon: Truck, bg: 'bg-blue-500', label: 'Delivery', accent: 'border-blue-400' };
  if (text.includes('order'))
    return { icon: ShoppingBag, bg: 'bg-emerald-500', label: 'Order', accent: 'border-emerald-400' };
  return { icon: Bell, bg: 'bg-indigo-500', label: 'Notification', accent: 'border-indigo-400' };
}

function getRoute(type = '', notif = {}) {
  const t = type.toUpperCase();
  const orderId = notif.orderId || notif.order_id || notif.data?.orderId || notif.targetId;
  if (t === 'NEW_RESTAURANT_REGISTRATION') return '/restaurants';
  if (t === 'NEW_PARTNER_REGISTRATION') return '/delivery-partners';
  if (t === 'ORDER_DELIVERED' || t === 'DELIVERY_CANCELLED' || t === 'DELIVERY_CANCELLED_ADMIN') return '/orders';
  if (orderId) return `/orders/${orderId}`;
  return '/activity-log';
}

// Single toast card
function PopupCard({ notif, onDismiss }) {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const type = notif.type || '';
  const meta = getPopupMeta(type, notif.title, notif.body);
  const Icon = meta.icon;

  const startTimer = useCallback(() => {
    timerRef.current = setTimeout(() => onDismiss(notif.id), AUTO_DISMISS_MS);
  }, [notif.id, onDismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [startTimer]);

  const handleClick = () => {
    onDismiss(notif.id);
    navigate(getRoute(type, notif));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      className={`relative w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 border-l-4 ${meta.accent} overflow-hidden cursor-pointer`}
      onClick={handleClick}
    >
      {/* Progress bar */}
      <motion.div
        className={`absolute top-0 left-0 h-0.5 ${meta.bg} opacity-60`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
      />

      <div className="flex items-start gap-3 p-3.5">
        {/* Icon */}
        <div className={`shrink-0 w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shadow-sm`}>
          <Icon size={16} className="text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{meta.label}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(notif.id); }}
              className="p-0.5 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">
            {notif.title || meta.label}
          </p>
          {notif.body && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
          )}
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-indigo-500 font-semibold">
            <ExternalLink size={9} />
            <span>View details</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Container — renders from context
export default function NotificationPopup({ popups, onDismiss }) {
  const visible = (popups || []).slice(0, MAX_VISIBLE);

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none">
      <AnimatePresence mode="sync">
        {visible.map((notif) => (
          <div key={notif.id} className="pointer-events-auto">
            <PopupCard notif={notif} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
