import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Utensils, Truck, Bell,
  ClipboardList, Tag, Menu, BarChart3,
  Settings, CheckCircle, Calendar,
  Gift, Navigation, Image, ChevronLeft,
  ChevronRight, ChevronDown, Plus, Search, X, ChefHat, Store, CreditCard, PackageCheck,
  Megaphone, Boxes,
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
  { id: 'orders', path: '/orders', icon: ClipboardList, label: 'Orders' },
  { id: 'home-foods-providers', path: '/home-foods/providers', icon: Store, label: 'Home Foods Providers', adminOnly: true },
  { id: 'home-foods-plans', path: '/home-foods/plans', icon: Menu, label: 'Home Foods Plans', adminOnly: true },
  { id: 'home-foods-subscriptions', path: '/home-foods/subscriptions', icon: CreditCard, label: 'Home Foods Subscriptions', adminOnly: true },
  { id: 'home-foods-deliveries', path: '/home-foods/deliveries', icon: PackageCheck, label: 'Home Foods Deliveries', adminOnly: true },
  { id: 'home-foods-menus', path: '/home-foods/menus', icon: ChefHat, label: 'Kitchens Menu', adminOnly: true },
  { id: 'home-foods-analytics', path: '/home-foods/analytics', icon: BarChart3, label: 'Home Foods Analytics', adminOnly: true },
  { id: 'push-notifications', path: '/marketing/push-notifications', icon: Bell, label: 'Push Notifications', adminOnly: true },
  { id: 'subscription', path: '/subscription', icon: Calendar, label: 'Subscription', isUpcoming: true },
  { id: 'booking-approval', path: '/bookings/approval', icon: CheckCircle, label: 'Dining Approval' },
  { id: 'bookings', path: '/bookings', icon: Calendar, label: 'Booking Management', adminOnly: true },
  { id: 'offers-approval', path: '/offers', icon: Tag, label: 'Restaurant Offers' },
  { id: 'admin-offers', path: '/offers/existing', icon: Gift, label: 'Admin Offers', adminOnly: true },
  { id: 'coupon', path: '/coupon', icon: Tag, label: 'Coupons', adminOnly: true },
  { id: 'cuisine', path: '/cuisine', icon: Utensils, label: 'Cuisine Categories', adminOnly: true },
  { id: 'quick-menu', path: '/quick-menu', icon: Search, label: 'Quick Menu', adminOnly: true },
  { id: 'top-restaurants', path: '/top-restaurants', icon: Gift, label: 'Top Restaurants', adminOnly: true },
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

const sectionDefinitions = [
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: Utensils,
    itemIds: ['restaurants', 'menu', 'quick-menu', 'cuisine', 'top-restaurants'],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    itemIds: ['admin-offers', 'offers-approval', 'coupon', 'banners', 'push-notifications'],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    icon: Truck,
    itemIds: ['orders', 'live-tracking', 'delivery-partners'],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Boxes,
    itemIds: [
      'bookings',
      'booking-approval',
      'customers',
      'subscription',
    ],
  },
  {
    id: 'home-foods',
    label: 'Home Foods',
    icon: ChefHat,
    itemIds: [
      'home-foods-providers',
      'home-foods-plans',
      'home-foods-subscriptions',
      'home-foods-deliveries',
      'home-foods-menus',
      'home-foods-analytics',
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    itemIds: ['analytics'],
  },
];

const Sidebar = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [platformName, setPlatformName] = useState('Zenzio');
  const [collapsed, setCollapsed] = useState(false);
  const restaurantAdmin = isRestaurantAdmin();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

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

  const canShowItem = (item) => {
    if (restaurantAdmin && item.adminOnly) return false;
    return true;
  };

  const normalizeItemForRole = (item) => {
    if (restaurantAdmin && item.id === 'restaurants') {
      return { ...item, label: 'Manage Restaurant' };
    }
    return item;
  };

  const visibleMenuItems = useMemo(
    () => menuItems.filter(canShowItem).map(normalizeItemForRole),
    [restaurantAdmin],
  );

  const menuItemById = useMemo(
    () => new Map(visibleMenuItems.map((item) => [item.id, item])),
    [visibleMenuItems],
  );

  const sections = useMemo(
    () => sectionDefinitions
      .map((section) => ({
        ...section,
        items: section.itemIds.map((itemId) => menuItemById.get(itemId)).filter(Boolean),
      }))
      .filter((section) => section.items.length > 0),
    [menuItemById],
  );

  const dashboardItem = menuItemById.get('dashboard');
  const settingsItem = menuItemById.get('settings');

  const visibleQuickAdd = restaurantAdmin
    ? quickAddItems.filter(i => i.id === 'add-menu')
    : quickAddItems;

  const isActive = (item) => {
    if (!item?.path) return false;

    if (item.id === 'admin-offers') {
      return location.pathname === '/offers/existing'
        || location.pathname.startsWith('/offers/admin/');
    }

    if (item.id === 'offers-approval') {
      return location.pathname === '/offers'
        || location.pathname === '/offers/create'
        || location.pathname.startsWith('/offers/edit/')
        || (/^\/offers\/[^/]+$/.test(location.pathname)
          && !location.pathname.startsWith('/offers/admin/')
          && !location.pathname.startsWith('/offers/existing'));
    }

    if (item.id === 'booking-approval') {
      return location.pathname.startsWith('/bookings/approval')
        || location.pathname.startsWith('/events/approval');
    }

    if (item.id === 'bookings') {
      return location.pathname === '/bookings'
        || (location.pathname.startsWith('/bookings/')
          && !location.pathname.startsWith('/bookings/approval'));
    }

    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  };

  const activeSectionId = useMemo(() => {
    const activeSection = sections.find((section) =>
      section.items.some((item) => isActive(item)),
    );
    return activeSection?.id || null;
  }, [location.pathname, sections]);

  useEffect(() => {
    if (activeSectionId) {
      setExpandedSection(activeSectionId);
      return;
    }

    if (location.pathname === '/' || location.pathname === '/dashboard') {
      setExpandedSection('restaurant');
      return;
    }

    setExpandedSection(null);
  }, [activeSectionId, location.pathname]);

  const allSearchable = useMemo(
    () => [
      ...visibleMenuItems.filter((item) => item.path && !item.isUpcoming),
      ...visibleQuickAdd,
    ],
    [visibleMenuItems, visibleQuickAdd],
  );

  const searchQuery = search.trim().toLowerCase();
  const searchResults = searchQuery
    ? allSearchable.filter((item) =>
        item.label.toLowerCase().includes(searchQuery),
      )
    : [];

  const navigateTo = (item) => {
    if (!item.path || item.isUpcoming) return;
    const parentSection = sections.find((section) =>
      section.items.some((sectionItem) => sectionItem.id === item.id),
    );
    if (parentSection) {
      setExpandedSection(parentSection.id);
    }
    setSearch('');
    navigate(item.path);
  };

  const renderTooltip = (label) => (
    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
      {label}
    </div>
  );

  const renderNavItem = (item, { child = false, accent = 'default' } = {}) => {
    const active = isActive(item);
    const Icon = item.icon;
    const activeClass = accent === 'quick'
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'bg-sidebar-active text-white';
    const inactiveClass = item.isUpcoming
      ? 'text-gray-600 cursor-not-allowed'
      : accent === 'quick'
        ? 'text-emerald-500/70 hover:text-emerald-400 hover:bg-sidebar-hover'
        : 'text-gray-400 hover:text-gray-200 hover:bg-sidebar-hover';

    return (
      <div key={item.id} className="relative group">
        <motion.button
          whileHover={item.isUpcoming ? undefined : { x: 2 }}
          whileTap={item.isUpcoming ? undefined : { scale: 0.98 }}
          onClick={() => navigateTo(item)}
          disabled={item.isUpcoming}
          className={`w-full flex items-center gap-3 rounded-lg transition-all duration-150 relative ${
            child ? 'pl-3 pr-2 py-1.5' : 'px-3 py-2'
          } ${active ? activeClass : inactiveClass}`}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {active && (
            <motion.div
              layoutId="activeIndicator"
              className={`absolute left-0 w-0.5 ${child ? 'h-4' : 'h-5'} bg-indigo-400 rounded-full`}
              style={{ boxShadow: '0 0 8px rgba(99,102,241,0.5)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <motion.div
            animate={active ? { scale: 1.05 } : { scale: 1 }}
            className="flex-shrink-0"
          >
            <Icon size={collapsed ? 20 : child ? 14 : 17} />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={`${child || accent === 'quick' ? 'text-xs' : 'text-sm'} font-medium truncate whitespace-nowrap`}
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
        {collapsed && hoveredItem === item.id && renderTooltip(item.label)}
      </div>
    );
  };

  const renderSection = (section) => {
    const open = expandedSection === section.id;
    const sectionActive = activeSectionId === section.id;
    const Icon = section.icon;

    return (
      <div key={section.id} className="relative group">
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (collapsed) {
              setCollapsed(false);
              setExpandedSection(section.id);
              return;
            }
            setExpandedSection((current) => current === section.id ? null : section.id);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
            sectionActive
              ? 'text-indigo-200 bg-indigo-500/12'
              : 'text-gray-400 hover:text-gray-200 hover:bg-sidebar-hover'
          }`}
          onMouseEnter={() => setHoveredItem(section.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <motion.div
            animate={sectionActive ? { scale: 1.05 } : { scale: 1 }}
            className="flex-shrink-0"
          >
            <Icon size={collapsed ? 20 : 17} />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-sm font-semibold truncate whitespace-nowrap flex-1 text-left"
              >
                {section.label}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && (
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.22 }}
              className="flex-shrink-0"
            >
              <ChevronDown size={14} className="text-gray-500" />
            </motion.div>
          )}
        </motion.button>

        {collapsed && hoveredItem === section.id && renderTooltip(section.label)}

        <AnimatePresence initial={false}>
          {open && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-1 mb-1 ml-4 pl-3 border-l border-indigo-500/20 space-y-0.5">
                {section.items.map((item) => renderNavItem(item, { child: true }))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 232 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="sticky top-0 bg-sidebar text-white flex flex-col h-screen flex-shrink-0 overflow-hidden border-r border-sidebar-border z-40"
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
          onClick={() => { setCollapsed((current) => { if (!current) setSearch(''); return !current; }); }}
          className="p-1 rounded-lg hover:bg-sidebar-hover text-gray-400 hover:text-white transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 show-scrollbar-on-hover">
        {!collapsed && (
          <div className="relative mb-2">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-7 py-2 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-colors"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {searchQuery && (
          <div className="mb-2 space-y-0.5">
            {searchResults.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-600">No results for "{search}"</p>
            ) : (
              searchResults.map((item) => (
                <div key={item.id}>
                  {renderNavItem(item)}
                </div>
              ))
            )}
            <div className="my-2 mx-1 border-t border-sidebar-border" />
          </div>
        )}

        {!searchQuery && dashboardItem && renderNavItem(dashboardItem)}

        {!searchQuery && sections.map(renderSection)}

        {!searchQuery && settingsItem && renderNavItem(settingsItem)}

        {visibleQuickAdd.length > 0 && (
          <>
            <div className="my-3 mx-3 border-t border-sidebar-border" />
            {!collapsed && (
              <div className="px-3 py-1">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Quick Add</span>
              </div>
            )}
            {visibleQuickAdd.map((item) => renderNavItem(item, { accent: 'quick' }))}
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
