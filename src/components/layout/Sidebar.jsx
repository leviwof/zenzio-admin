import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Utensils, Truck,
  ClipboardList, Tag, Menu, BarChart3,
  Settings, CheckCircle, Calendar,
  Gift, Navigation, Image, ChevronLeft,
  ChevronRight, Plus, Search
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { getAdminProfile } from '../../services/api';
import { isRestaurantAdmin } from '../../utils/auth';

const menuItems = [
  { id: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'customers', path: '/customers', icon: Users, label: 'Customers', adminOnly: true },
  { id: 'restaurants', path: '/restaurants', icon: Utensils, label: 'Restaurants' },
  { id: 'delivery-partners', path: '/delivery-partners', icon: Truck, label: 'Delivery Executives', adminOnly: true },
  { id: 'live-tracking', path: '/live-tracking', icon: Navigation, label: 'Live Tracking' },
  { id: 'orders', path: '/orders', icon: ClipboardList, label: 'Order Monitoring' },
  { id: 'subscription', path: '/subscription', icon: Calendar, label: 'Subscription', isUpcoming: true },
  { id: 'booking-approval', path: '/bookings/approval', icon: CheckCircle, label: 'Dining Approval' },
  { id: 'bookings', path: '/bookings', icon: Calendar, label: 'Booking Management', adminOnly: true },
  { id: 'offers-approval', path: '/offers', icon: Tag, label: 'Restaurant Offers' },
  { id: 'admin-offers', path: '/offers/existing', icon: Gift, label: 'Admin Offers', adminOnly: true },
  { id: 'coupon', path: '/coupon', icon: Tag, label: 'Coupon', adminOnly: true },
  { id: 'cuisine', path: '/cuisine', icon: Utensils, label: 'Cuisine Categories', adminOnly: true },
  { id: 'quick-menu', path: '/quick-menu', icon: Search, label: 'Quick Menu', adminOnly: true },
  { id: 'menu', path: '/menu', icon: Menu, label: 'Menu' },
  { id: 'banners', path: '/banners', icon: Image, label: 'Banners', adminOnly: true },
  { id: 'analytics', path: '/analytics', icon: BarChart3, label: 'Analytics', adminOnly: true },
  { id: 'settings', path: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
];

const quickAddItems = [
  { id: 'add-menu', path: '/menu/add', icon: Plus, label: 'Add Menu' },
  { id: 'add-dining', path: '/dining/add', icon: Plus, label: 'Add Dining' },
  { id: 'add-event', path: '/events/add', icon: Plus, label: 'Add Event' },
];

const Sidebar = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [platformName, setPlatformName] = useState('Zenzio');
  const [collapsed, setCollapsed] = useState(false);
  const restaurantAdmin = isRestaurantAdmin();
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    const fetchPlatformName = async () => {
      try {
        const response = await getAdminProfile();
        const data = response.data;
        const name = data.name || (data.data && data.data.name);
        if (name) setPlatformName(name);
      } catch (error) {
        console.error('Failed to fetch platform name', error);
      }
    };
    fetchPlatformName();
  }, []);

  const visibleMenuItems = menuItems.filter(item => {
    if (restaurantAdmin && item.adminOnly) return false;
    return true;
  }).map(item => {
    if (restaurantAdmin && item.id === 'restaurants') {
      return { ...item, label: 'Manage Restaurant' };
    }
    return item;
  });

  const visibleQuickAdd = restaurantAdmin
    ? quickAddItems.filter(i => i.id === 'add-menu')
    : quickAddItems;

  const isActive = (item) => {
    if (item.id === 'admin-offers' && location.pathname.startsWith('/offers/') &&
        !location.pathname.startsWith('/offers/approval') && !location.pathname.startsWith('/offers/create')) {
      return true;
    }
    return location.pathname === item.path;
  };

  if (!isOpen) return null;

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 224 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-sidebar text-white flex flex-col h-screen flex-shrink-0 overflow-hidden border-r border-sidebar-border"
    >
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-sm truncate whitespace-nowrap">{platformName}</span>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex justify-center"
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-sidebar-hover text-gray-400 hover:text-white transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 show-scrollbar-on-hover">
        {visibleMenuItems.map((item) => {
          const active = isActive(item);
          return (
            <div key={item.id} className="relative group">
              <motion.button
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => !item.isUpcoming && navigate(item.path)}
                disabled={item.isUpcoming}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative ${
                  active
                    ? 'bg-sidebar-active text-white'
                    : item.isUpcoming
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-sidebar-hover'
                }`}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-0.5 h-5 bg-indigo-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(99,102,241,0.5)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={active ? { scale: 1.05 } : { scale: 1 }}
                  className="flex-shrink-0"
                >
                  <item.icon size={collapsed ? 20 : 18} />
                </motion.div>
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium truncate whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.isUpcoming && !collapsed && (
                  <span className="ml-auto text-[9px] bg-indigo-500/10 text-indigo-400/60 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold border border-indigo-500/10">
                    Soon
                  </span>
                )}
              </motion.button>
              {collapsed && hoveredItem === item.id && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}

        {visibleQuickAdd.length > 0 && (
          <>
            <div className="my-3 mx-3 border-t border-sidebar-border" />
            {!collapsed && (
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Quick Add</span>
              </div>
            )}
            {visibleQuickAdd.map((item) => {
              const active = location.pathname === item.path;
              return (
                <div key={item.id} className="relative group">
                  <motion.button
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-emerald-500/60 hover:text-emerald-400 hover:bg-sidebar-hover'
                    }`}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Plus size={collapsed ? 16 : 14} />
                    {!collapsed && (
                      <span className="text-xs font-medium truncate whitespace-nowrap">{item.label}</span>
                    )}
                  </motion.button>
                  {collapsed && hoveredItem === item.id && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      <div className={`px-4 py-3 border-t border-sidebar-border ${collapsed ? 'text-center' : ''}`}>
        {collapsed ? (
          <p className="text-[10px] text-gray-600">v1.2</p>
        ) : (
          <p className="text-[10px] text-gray-600">© 2026 Zenzio Admin • v1.2.4</p>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
