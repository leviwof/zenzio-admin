import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Utensils, Truck,
  ClipboardList, Tag, Menu, BarChart3,
  Settings, HelpCircle, CheckCircle, Calendar,
  Gift, Award, Navigation, Image
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { getAdminProfile } from '../../services/api';

const Sidebar = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [platformName, setPlatformName] = useState('Zenzio Admin');

  useEffect(() => {
    const fetchPlatformName = async () => {
      try {
        const response = await getAdminProfile();
        const data = response.data;
        const name = data.name || (data.data && data.data.name);
        if (name) {
          setPlatformName(name);
        }
      } catch (error) {
        console.error('Failed to fetch platform name for sidebar', error);
      }
    };

    fetchPlatformName();

    const handleNameUpdate = (event) => {
      if (event.detail && event.detail.name) {
        setPlatformName(event.detail.name);
      }
    };

    window.addEventListener('platformNameUpdated', handleNameUpdate);

    return () => {
      window.removeEventListener('platformNameUpdated', handleNameUpdate);
    };
  }, []);

  const menuItems = [
    { id: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'customers', path: '/customers', icon: Users, label: 'Customers' },
    { id: 'restaurants', path: '/restaurants', icon: Utensils, label: 'Restaurants' },
    { id: 'delivery-partners', path: '/delivery-partners', icon: Truck, label: 'Delivery Partners' },
    { id: 'live-tracking', path: '/live-tracking', icon: Navigation, label: 'Live Tracking' },
    { id: 'orders', path: '/orders', icon: ClipboardList, label: 'Order Monitoring' },

    // Subscription Management
    { id: 'subscription', path: '/subscription', icon: Calendar, label: 'My Subscription', isUpcoming: true },

    // Booking Management
    { id: 'booking-approval', path: '/bookings/approval', icon: CheckCircle, label: 'Dining Approval' },
    { id: 'bookings', path: '/bookings', icon: Calendar, label: 'Booking Management' },

    // Offer Management - Two separate sections
    { id: 'offers-approval', path: '/offers', icon: Tag, label: 'Restaurant Offers' },
    { id: 'admin-offers', path: '/offers/existing', icon: Gift, label: 'Admin Offers' },

    // Coupon Management
    { id: 'coupon', path: '/coupon', icon: Tag, label: 'Coupon' },
    { id: 'cuisine', path: '/cuisine', icon: Utensils, label: 'Cuisine Categories' },

    { id: 'menu', path: '/menu', icon: Menu, label: 'Menu' },
    { id: 'banners', path: '/banners', icon: Image, label: 'Banners' },
    { id: 'analytics', path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'settings', path: '/settings', icon: Settings, label: 'Settings' },
    // { id: 'support', path: '/support', icon: HelpCircle, label: 'Support' },

  ];

  // Admin Management Items (Add operations)
  const adminItems = [
    { id: 'add-menu', path: '/menu/add', icon: Menu, label: '+ Add Menu' },
    { id: 'add-dining', path: '/dining/add', icon: Utensils, label: '+ Add Dining Space' },
    { id: 'add-event', path: '/events/add', icon: Calendar, label: '+ Add Event' },
  ];

  if (!isOpen) return null;

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 flex items-center space-x-3">
        {/* Logo Image - Red box replace panniten */}
        <div className="w-10 h-10 flex items-center justify-center">
          <img
            src={logo}
            alt="Zenzio Admin"
            className="w-full h-full object-contain"
          />
        </div>
        <span className="font-bold text-lg">{platformName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map(item => {
          // Check if current path matches or starts with the item path
          const isActive = location.pathname === item.path ||
            (item.id === 'admin-offers' && location.pathname.startsWith('/offers/'));

          return (
            <button
              key={item.id}
              onClick={() => !item.isUpcoming && navigate(item.path)}
              disabled={item.isUpcoming}
              className={`w-full flex items-center justify-between px-6 py-3 transition ${isActive
                ? 'bg-red-500 text-white'
                : item.isUpcoming
                  ? 'text-gray-600 cursor-not-allowed bg-transparent'
                  : 'text-gray-300 hover:bg-gray-800'
                }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon size={20} />
                <span>{item.label}</span>
              </div>
              {item.isUpcoming && (
                <span className="text-[10px] bg-red-500/10 text-red-500/50 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-red-500/20">
                  Soon
                </span>
              )}
            </button>
          );
        })}

        {/* Admin Quick Actions Divider */}
        <div className="mx-4 my-4 border-t border-gray-700" />
        <div className="px-6 py-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Add</span>
        </div>

        {adminItems.map(item => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-3 px-6 py-3 transition ${isActive
                ? 'bg-green-600 text-white'
                : 'text-green-400 hover:bg-gray-800 hover:text-green-300'
                }`}
            >
              <item.icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 text-xs text-gray-500">
        © 2025 Zenzio Admin<br />Version 1.2.4
      </div>
    </div>
  );
};

export default Sidebar;