import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet, useNavigate } from 'react-router-dom';
import NotificationPopup from '../ui/NotificationPopup';
import NotificationPermissionBanner from '../ui/NotificationPermissionBanner';
import { useOrderNotifications } from '../../context/OrderNotificationContext';
import { Bell, X } from 'lucide-react';

const formatDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const Layout = ({ onLogout }) => {
  const navigate = useNavigate();
  const { popupQueue, dismissPopup, orderToasts, dismissOrderToast } = useOrderNotifications();

  return (
    <div className="flex h-screen bg-gray-50/80">
      <Sidebar isOpen={true} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Permission denied warning — shown when browser notifications are blocked */}
        <NotificationPermissionBanner />

        <Header onLogout={onLogout} />

        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global in-app notification popups — rendered outside main scroll area */}
      <NotificationPopup popups={popupQueue} onDismiss={dismissPopup} />

      {/* Global new-order toast cards — top-right, visible on every page */}
      {orderToasts.length > 0 && (
        <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
          {orderToasts.map((t) => (
            <div
              key={t.id}
              onClick={() => navigate(`/orders/${t.orderId}`)}
              className={`pointer-events-auto w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden cursor-pointer
                ${t.exiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Bell size={16} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide">New Order</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissOrderToast(t.id); }}
                      className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">#{t.orderId}</p>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs text-gray-600"><span className="text-gray-400">Customer:</span> {t.customerName}</p>
                    <p className="text-xs text-gray-600"><span className="text-gray-400">Restaurant:</span> {t.restaurantName}</p>
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                      <p className="text-sm font-bold text-gray-900">₹{t.amount}</p>
                      <p className="text-[10px] text-gray-400">{formatDateTime(t.time)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-400 animate-pulse" style={{ width: '100%' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Layout;
