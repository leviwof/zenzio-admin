import React, { useState, useEffect } from "react";
import {
  Users,
  Utensils,
  Truck,
  ShoppingCart,
  Calendar,
  Tag,
  Check,
  AlertCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAllCustomers,
  getAllDeliveryPartners,
  getAllRestaurants,
  getOrderMonitoringStats,
  getBookingStats,
  getPendingOffers,
  getAdminAnalytics,
  getAllOrders
} from "../../services/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [totalDeliveryPartners, setTotalDeliveryPartners] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [offersPending, setOffersPending] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    await Promise.all([
      fetchCustomers(),
      fetchRestaurants(),
      fetchPartners(),
      fetchActiveOrders(),
      fetchPendingBookings(),
      fetchOffersPending(),
      fetchTotalRevenue(),
      fetchRecentActivities(),
    ]);
  };

  const fetchRecentActivities = async () => {
    try {
      setLoadingActivities(true);
      const res = await getAllOrders({ limit: 10 });
      const rawOrders = res.data || [];

      // Transform real orders into activity objects
      const formattedActivities = rawOrders.slice(0, 10).map((order) => {
        let text = `Order #${order.orderId} is ${order.restaurantStatus || 'processing'}`;
        let type = "success";

        if (order.restaurantStatus === 'new') {
          text = `New order received: #${order.orderId}`;
          type = "warning";
        } else if (order.restaurantStatus === 'rejected' || order.restaurantStatus === 'cancelled') {
          text = `Order #${order.orderId} was ${order.restaurantStatus}`;
          type = "error";
        } else if (order.deliveryPartnerStatus === 'delivered') {
          text = `Order #${order.orderId} successfully delivered`;
          type = "success";
        } else if (order.restaurantStatus === 'accepted') {
          text = `Order #${order.orderId} accepted by restaurant`;
          type = "success";
        }

        // Simulating "Time Ago" since we don't have a library like date-fns/timeago here
        const time = order.time ? new Date(order.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently";

        return {
          type,
          text,
          time,
          orderId: order.orderId, // Add orderId for navigation
        };
      });

      setActivities(formattedActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchTotalRevenue = async () => {
    try {
      const res = await getAdminAnalytics("last7days");
      setTotalRevenue(res.data?.totalRevenue || 0);
    } catch (error) {
      console.error("Error fetching total revenue:", error);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const res = await getOrderMonitoringStats();
      setActiveOrders(res.data?.active || 0);
    } catch (error) {
      console.error("Error fetching active orders:", error);
    }
  };

  const fetchPendingBookings = async () => {
    try {
      const res = await getBookingStats();
      setPendingBookings(res.data?.pending || 0);
    } catch (error) {
      console.error("Error fetching pending bookings:", error);
    }
  };

  const fetchOffersPending = async () => {
    try {
      const res = await getPendingOffers();
      const offers = res.data || [];
      setOffersPending(Array.isArray(offers) ? offers.length : 0);
    } catch (error) {
      console.error("Error fetching pending offers:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const params = {
        page: 1,
        limit: 10,
        search: "",
        sortBy: "",
        status: "",
        statusFilter: "All",
        startDate: "",
        endDate: "",
      };

      // Remove empty keys to avoid sending ?status=&search=
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
      );

      const response = await getAllCustomers(cleanParams);
      const users = response?.data?.data ?? [];

      setTotalCustomers(Array.isArray(users) ? users.length : 0);
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      setTotalCustomers(0);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const response = await getAllRestaurants({});
      const restaurants = response?.data ?? [];
      setTotalRestaurants(Array.isArray(restaurants) ? restaurants.length : 0);
    } catch (error) {
      console.error(" Error fetching restaurants:", error);
      setTotalRestaurants(0);
    }
  };


  const fetchPartners = async () => {
    try {
      const response = await getAllDeliveryPartners();
      const backendData = response?.data.data || [];
      setTotalDeliveryPartners(Array.isArray(backendData) ? backendData.length : 0)
    } catch (error) {
      console.error(error);

    }
  };

  const stats = [
    {
      label: "Total Customers",
      value: totalCustomers,
      change: "-",
      icon: Users,
      color: "text-red-500",
      link: "/customers",
    },
    {
      label: "Total Restaurants",
      value: totalRestaurants,
      change: "-",
      icon: Utensils,
      color: "text-red-500",
      link: "/restaurants",
    },
    {
      label: "Total Delivery Partners",
      value: totalDeliveryPartners,
      change: "-",
      icon: Truck,
      color: "text-red-500",
      link: "/delivery-partners",
    },
    {
      label: "Active Orders",
      value: activeOrders,
      change: "-",
      icon: ShoppingCart,
      color: "text-red-500",
      link: "/orders",
    },
    {
      label: "Pending Bookings",
      value: pendingBookings,
      change: "-",
      icon: Calendar,
      color: "text-red-500",
      link: "/bookings",
    },
    {
      label: "Offers Pending Approval",
      value: offersPending,
      change: "-",
      icon: Tag,
      color: "text-red-500",
      link: "/offers",
    },
    {
      label: "Total Earnings (7D)",
      value: `₹${totalRevenue.toLocaleString()}`,
      change: "-",
      icon: Check,
      color: "text-green-500",
      link: "/analytics",
    },
  ];



  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      {/* Welcome Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1E293B] tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <div className="bg-red-50 p-2 rounded-xl">
            <Calendar className="text-red-500" size={20} />
          </div>
          <div className="pr-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Today's Date</p>
            <p className="text-sm font-bold text-slate-700">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            onClick={() => navigate(stat.link)}
            className="group relative bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden cursor-pointer"
          >
            {/* Background Decorative Element */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-150 ${stat.color.replace('text', 'bg')}`} />

            <div className="flex flex-col h-full justify-between relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.color.replace('text', 'bg').replace('-500', '-50')} transition-colors duration-300 group-hover:bg-slate-900 group-hover:text-white`}>
                  <stat.icon size={22} className={stat.color === 'text-red-500' ? 'group-hover:text-white' : ''} />
                </div>
                <div className="text-xs font-bold text-slate-300 uppercase tracking-widest group-hover:text-slate-400">
                  Live
                </div>
              </div>

              <div>
                <p className="text-slate-500 text-sm font-semibold mb-1 uppercase tracking-tight">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                    {stat.value}
                  </h3>
                  {stat.change !== "-" && (
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                      {stat.change}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Recent Activity
              <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest italic">
                Real-time
              </span>
            </h2>
            <button onClick={fetchRecentActivities} className="text-slate-400 hover:text-red-500 transition-colors">
              <RefreshCw size={18} className="animate-spin-slow" />
            </button>
          </div>

          <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-50">
            {loadingActivities ? (
              <div className="py-20 text-center">
                <RefreshCw className="text-red-500 animate-spin mx-auto mb-4" size={32} />
                <p className="text-slate-400 font-medium italic">Fetching latest pulse...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="py-20 text-center">
                <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                  <ShoppingCart className="text-slate-300" size={32} />
                </div>
                <p className="text-slate-400 font-medium italic">No recent pulses detected.</p>
              </div>
            ) : (
              activities.map((activity, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/orders/${activity.orderId}`)}
                  className="flex items-start space-x-6 relative z-10 transition-all duration-300 hover:translate-x-1 cursor-pointer group"
                >
                  <div
                    className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border-2 border-white ${activity.type === "success"
                      ? "bg-emerald-500"
                      : activity.type === "warning"
                        ? "bg-amber-500"
                        : "bg-red-500"
                      }`}
                  >
                    {activity.type === "success" ? (
                      <Check className="text-white" size={14} />
                    ) : activity.type === "warning" ? (
                      <AlertCircle className="text-white" size={14} />
                    ) : (
                      <XCircle className="text-white" size={14} />
                    )}
                  </div>
                  <div className="flex-1 bg-slate-50/50 p-4 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-white transition-all">
                    <p className="text-slate-700 font-bold text-sm leading-relaxed">{activity.text}</p>
                    <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{activity.time}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/orders/${activity.orderId}`);
                    }}
                    className="mt-4 p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 hover:scale-110 transition-all"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
            {/* Decorative Sphere */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full" />

            <h2 className="text-xl font-bold mb-6 relative z-10 text-slate-800">Quick Actions</h2>
            <div className="flex flex-col gap-4 relative z-10">
              <button
                onClick={() => navigate("/restaurants", { state: { tab: "inactive" } })}
                className="group w-full p-4 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-100 hover:bg-red-50 hover:border-red-200 transition-all duration-300"
              >
                <div className="bg-red-500 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <Check size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black tracking-tight text-slate-800">Approve Restaurants</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pending Review</p>
                </div>
              </button>

              <button
                onClick={() => navigate("/offers")}
                className="group w-full p-4 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all duration-300"
              >
                <div className="bg-blue-500 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <Tag size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black tracking-tight text-slate-800">Review Offers</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Discounts</p>
                </div>
              </button>

              <button
                disabled
                className="group w-full p-4 bg-slate-50/50 rounded-2xl flex items-center gap-4 border border-slate-100 opacity-50 cursor-not-allowed"
              >
                <div className="bg-slate-400 p-2 rounded-xl">
                  <AlertCircle size={18} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-black tracking-tight text-slate-700">Process Refunds</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Coming Soon</p>
                </div>
                <span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Soon</span>
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-3xl text-center shadow-lg shadow-red-500/20">
                <p className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-white/80">Premium Support</p>
                <h4 className="font-bold mb-4 text-white">Dedicated Assistance</h4>
                <a
                  href="tel:8248907587"
                  className="block w-full py-3 bg-white text-slate-900 rounded-xl text-sm font-black hover:bg-slate-100 transition-all text-center"
                >
                  Contact Help Center
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
