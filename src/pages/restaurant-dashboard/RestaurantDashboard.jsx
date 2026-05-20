import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Tag, IndianRupee, Power, PowerOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRestaurantAdminStats, toggleRestaurantActive, toggleRestaurantOff, getRestaurantById } from '../../services/api';
import { toast } from 'react-hot-toast';

const RestaurantDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    totalOffers: 0,
    totalEarnings: 0,
  });
  const [isActive, setIsActive] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, user?.restaurantUid]);

  const fetchData = useCallback(async () => {
    if (!user?.restaurantUid) return;

    try {
      setLoading(true);
      setError('');
      const [statsRes, restRes] = await Promise.all([
        getRestaurantAdminStats(user.restaurantUid),
        getRestaurantById(user.restaurantUid),
      ]);

      const d = statsRes.data?.data || statsRes.data || {};
      setStats({
        totalOrders: d.totalOrders || 0,
        activeOrders: d.activeOrders || 0,
        totalOffers: d.totalOffers || 0,
        totalEarnings: d.totalEarnings || d.totalRevenue || 0,
      });

      const rest = restRes.data?.data || restRes.data || {};
      const active = rest.isActive !== undefined ? rest.isActive : true;
      setIsActive(active);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load data';
      setError(`API error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantUid]);

  const handleToggle = async () => {
    if (!user?.restaurantUid) return;
    setToggling(true);
    try {
      if (isActive) {
        await toggleRestaurantOff(user.restaurantUid);
        setIsActive(false);
        toast.success('Restaurant turned off');
      } else {
        await toggleRestaurantActive(user.restaurantUid);
        setIsActive(true);
        toast.success('Restaurant turned on');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle');
    } finally {
      setToggling(false);
    }
  };

  const cards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/restaurant/orders',
    },
    {
      label: 'Active Orders',
      value: stats.activeOrders,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      link: '/restaurant/orders',
    },
    {
      label: 'Total Earnings',
      value: `₹${stats.totalEarnings.toLocaleString()}`,
      icon: IndianRupee,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      link: '/restaurant/orders',
    },
    {
      label: 'Offers',
      value: stats.totalOffers,
      icon: Tag,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      link: '/restaurant/offers',
    },
  ];

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {user?.name || 'Restaurant'} Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Manage your restaurant</p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition ${
            isActive
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          } disabled:opacity-50`}
        >
          {isActive ? <Power size={18} /> : <PowerOff size={18} />}
          {toggling ? 'Updating...' : isActive ? 'Restaurant Active' : 'Restaurant Off'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div
            key={i}
            onClick={() => navigate(card.link)}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer"
          >
            <div className={`w-12 h-12 ${card.bg} rounded-lg flex items-center justify-center mb-4`}>
              <card.icon size={24} className={card.color} />
            </div>
            <p className="text-sm text-gray-500 font-medium">{card.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {loading ? '...' : card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantDashboard;
