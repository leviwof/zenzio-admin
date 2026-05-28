import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeIndianRupee,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  RefreshCw,
  Sparkles,
  Store,
  Tag,
  Truck,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getAdminAnalytics,
  getAllDeliveryPartners,
  getAllOrders,
  getBookingStats,
  getCustomerStats,
  getLiveExecutives,
  getPendingOffers,
  getRestaurantStats,
} from "../../services/api";
import { getCurrentRestaurantUid, isRestaurantAdmin } from "../../utils/auth";

const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7days", label: "Last 7 Days" },
  { id: "last30days", label: "Last 30 Days" },
  { id: "thismonth", label: "This Month" },
  { id: "lastmonth", label: "Last Month" },
];

const FEED_TABS = ["Orders", "Restaurants", "Payments", "Customers", "System"];
const FILTER_STORAGE_KEY = "dashboard_filters_v2";

const formatDate = (date) => date.toISOString().split("T")[0];
const num = (value) => Number(value) || 0;

const getRevenueFromOrder = (order) => {
  if (!order) return 0;
  if (order.totalPrice != null) return num(order.totalPrice);
  if (order.total != null) return num(order.total);
  return Math.max(0, num(order.delivery_fee) + num(order.packing_charge) + num(order.taxes) - num(order.refundedAmount));
};

const getOrderDate = (order) => {
  const candidate = order?.createdAt || order?.time || order?.created_at || order?.updatedAt;
  const date = candidate ? new Date(candidate) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getRangeByPreset = (preset, customStart, customEnd) => {
  if (customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }

  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (preset === "today") return { start, end };
  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    return { start, end };
  }
  if (preset === "last7days") {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  if (preset === "last30days") {
    start.setDate(start.getDate() - 29);
    return { start, end };
  }
  if (preset === "thismonth") {
    start.setDate(1);
    return { start, end };
  }
  if (preset === "lastmonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setMonth(end.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return { start, end };
};

const getPreviousRange = ({ start, end }) => {
  const diff = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);
  return { start: prevStart, end: prevEnd };
};

const groupOrdersHourly = (orders) => {
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour: `${hour}:00`, orders: 0 }));
  orders.forEach((order) => {
    const date = getOrderDate(order);
    if (!date) return;
    hourly[date.getHours()].orders += 1;
  });
  return hourly;
};

const calculateMetrics = (orders) => {
  const metrics = {
    totalOrders: orders.length,
    totalRevenue: 0,
    activeOrders: 0,
    cancelledOrders: 0,
    refundAmount: 0,
    failedPayments: 0,
    avgDeliveryTime: 0,
    cancellationRate: 0,
    acceptanceRate: 0,
    uniqueCustomers: new Set(),
  };

  let acceptedOrders = 0;
  let completedOrders = 0;
  let deliveryMinutes = 0;

  orders.forEach((order) => {
    const revenue = getRevenueFromOrder(order);
    metrics.totalRevenue += revenue;
    metrics.refundAmount += num(order.refundedAmount);
    if (order.customer) metrics.uniqueCustomers.add(order.customer);

    const status = String(order.restaurantStatus || "").toLowerCase();
    const deliveryStatus = String(order.deliveryPartnerStatus || "").toLowerCase();
    const paymentStatus = String(order.paymentStatus || order.payment_status || "").toLowerCase();

    if (["accepted", "preparing", "ready", "picked_up"].includes(status)) {
      metrics.activeOrders += 1;
    }
    if (["rejected", "cancelled"].includes(status)) {
      metrics.cancelledOrders += 1;
    }
    if (["accepted", "preparing", "ready", "completed", "delivered"].includes(status)) {
      acceptedOrders += 1;
    }
    if (paymentStatus.includes("fail")) metrics.failedPayments += 1;

    const createdAt = getOrderDate(order);
    const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : null;
    if (createdAt && deliveredAt && !Number.isNaN(deliveredAt.getTime())) {
      const delta = (deliveredAt.getTime() - createdAt.getTime()) / (1000 * 60);
      if (delta > 0) {
        deliveryMinutes += delta;
        completedOrders += 1;
      }
    } else if (deliveryStatus === "delivered") {
      completedOrders += 1;
    }
  });

  metrics.cancellationRate = metrics.totalOrders ? (metrics.cancelledOrders / metrics.totalOrders) * 100 : 0;
  metrics.acceptanceRate = metrics.totalOrders ? (acceptedOrders / metrics.totalOrders) * 100 : 0;
  metrics.avgDeliveryTime = completedOrders && deliveryMinutes ? deliveryMinutes / completedOrders : 0;
  return metrics;
};

const percentDiff = (current, previous) => {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();
  const ownRestaurantUid = getCurrentRestaurantUid();

  const [now, setNow] = useState(new Date());
  const [activityTab, setActivityTab] = useState("Orders");
  const [chartsReady, setChartsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    currentOrders: [],
    previousOrders: [],
    adminAnalytics: null,
    totalCustomers: 0,
    restaurantStats: {},
    totalExecutives: 0,
    onlineExecutives: 0,
    pendingBookings: 0,
    pendingOffers: 0,
  });

  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  const mergedFilters = {
    preset: filters.preset || "last7days",
    customStart: filters.customStart || "",
    customEnd: filters.customEnd || "",
  };

  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(mergedFilters));
  }, [mergedFilters]);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setChartsReady(true), 350);
    return () => clearTimeout(timer);
  }, [mergedFilters.preset]);

  const dateRange = useMemo(
    () => getRangeByPreset(mergedFilters.preset, mergedFilters.customStart, mergedFilters.customEnd),
    [mergedFilters.customEnd, mergedFilters.customStart, mergedFilters.preset]
  );
  const previousDateRange = useMemo(() => getPreviousRange(dateRange), [dateRange]);

  const orderBelongsToOwnRestaurant = useCallback(
    (order) => {
      if (!restaurantAdmin || !ownRestaurantUid) return true;
      return (
        order.restaurant_uid === ownRestaurantUid ||
        order.restaurantUid === ownRestaurantUid ||
        order.restaurant_id === ownRestaurantUid ||
        order.restaurantId === ownRestaurantUid ||
        order.restaurant?.uid === ownRestaurantUid ||
        order.restaurant?.id === ownRestaurantUid
      );
    },
    [ownRestaurantUid, restaurantAdmin]
  );

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const startDate = formatDate(dateRange.start);
    const endDate = formatDate(dateRange.end);
    const previousStart = formatDate(previousDateRange.start);
    const previousEnd = formatDate(previousDateRange.end);
    const scopedRestaurantUid = restaurantAdmin && ownRestaurantUid ? ownRestaurantUid : undefined;

    const commonOrderFilter = {
      startDate,
      endDate,
      ...(scopedRestaurantUid ? { restaurant_uid: scopedRestaurantUid } : {}),
    };
    const previousOrderFilter = {
      startDate: previousStart,
      endDate: previousEnd,
      ...(scopedRestaurantUid ? { restaurant_uid: scopedRestaurantUid } : {}),
    };

    try {
      const [
        currentOrdersRes,
        previousOrdersRes,
        analyticsRes,
        customerStatsRes,
        restaurantStatsRes,
        liveExecRes,
        partnersRes,
        bookingRes,
        offersRes,
      ] = await Promise.allSettled([
        getAllOrders(commonOrderFilter),
        getAllOrders(previousOrderFilter),
        restaurantAdmin ? Promise.resolve({ data: {} }) : getAdminAnalytics(mergedFilters.preset),
        restaurantAdmin ? Promise.resolve({ data: { data: { total: 0 } } }) : getCustomerStats(),
        restaurantAdmin ? Promise.resolve({ data: { data: {} } }) : getRestaurantStats(),
        restaurantAdmin ? Promise.resolve({ data: [] }) : getLiveExecutives(),
        restaurantAdmin ? Promise.resolve({ data: { data: [] } }) : getAllDeliveryPartners(),
        getBookingStats({ startDate, endDate }),
        getPendingOffers(),
      ]);

      const currentOrdersRaw = currentOrdersRes.status === "fulfilled" ? currentOrdersRes.value.data || [] : [];
      const previousOrdersRaw = previousOrdersRes.status === "fulfilled" ? previousOrdersRes.value.data || [] : [];
      const currentOrders = currentOrdersRaw.filter(orderBelongsToOwnRestaurant);
      const previousOrders = previousOrdersRaw.filter(orderBelongsToOwnRestaurant);
      const analyticsData = analyticsRes.status === "fulfilled" ? analyticsRes.value.data : null;
      const customerData = customerStatsRes.status === "fulfilled" ? customerStatsRes.value.data?.data || {} : {};
      const restaurantData = restaurantStatsRes.status === "fulfilled" ? restaurantStatsRes.value.data?.data || {} : {};
      const onlineExecutives = liveExecRes.status === "fulfilled" ? (liveExecRes.value.data?.data || liveExecRes.value.data || []).length : 0;
      const totalExecutives = partnersRes.status === "fulfilled" ? (partnersRes.value.data?.data || []).length : 0;
      const pendingBookings = bookingRes.status === "fulfilled" ? bookingRes.value.data?.pending || bookingRes.value.data?.data?.pending || 0 : 0;
      const pendingOffers = offersRes.status === "fulfilled" ? (Array.isArray(offersRes.value.data) ? offersRes.value.data.length : 0) : 0;

      setData({
        currentOrders,
        previousOrders,
        adminAnalytics: analyticsData,
        totalCustomers: customerData.total || 0,
        restaurantStats: restaurantData,
        totalExecutives,
        onlineExecutives,
        pendingBookings,
        pendingOffers,
      });
    } catch (error) {
      console.error("Dashboard load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange.end, dateRange.start, mergedFilters.preset, orderBelongsToOwnRestaurant, ownRestaurantUid, previousDateRange.end, previousDateRange.start, restaurantAdmin]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const refreshInterval = setInterval(fetchDashboardData, 45000);
    return () => clearInterval(refreshInterval);
  }, [fetchDashboardData]);

  const currentMetrics = useMemo(() => calculateMetrics(data.currentOrders), [data.currentOrders]);
  const previousMetrics = useMemo(() => calculateMetrics(data.previousOrders), [data.previousOrders]);

  const revenueTrendData = useMemo(() => {
    if (data.adminAnalytics?.dailySalesData?.length) return data.adminAnalytics.dailySalesData;
    const map = {};
    data.currentOrders.forEach((order) => {
      const date = getOrderDate(order);
      if (!date) return;
      const key = date.toISOString().split("T")[0];
      map[key] = (map[key] || 0) + getRevenueFromOrder(order);
    });
    return Object.entries(map)
      .map(([day, sales]) => ({ day, sales: Number(sales.toFixed(2)) }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [data.adminAnalytics?.dailySalesData, data.currentOrders]);

  const ordersMixData = useMemo(() => {
    const completed = data.currentOrders.filter((o) => String(o.deliveryPartnerStatus || "").toLowerCase() === "delivered").length;
    const cancelled = data.currentOrders.filter((o) => ["cancelled", "rejected"].includes(String(o.restaurantStatus || "").toLowerCase())).length;
    return [
      { name: "Completed", value: completed },
      { name: "Cancelled", value: cancelled },
    ];
  }, [data.currentOrders]);

  const hourlyOrdersData = useMemo(() => groupOrdersHourly(data.currentOrders), [data.currentOrders]);

  const cuisinePerformance = useMemo(() => {
    if (data.adminAnalytics?.categoryData?.length) {
      return data.adminAnalytics.categoryData.slice(0, 6).map((entry) => ({
        name: entry.category,
        orders: Number(entry.orders) || 0,
        revenue: Number(entry.revenue) || 0,
      }));
    }
    return [];
  }, [data.adminAnalytics?.categoryData]);

  const topRestaurants = useMemo(() => data.adminAnalytics?.topRestaurantsData || [], [data.adminAnalytics?.topRestaurantsData]);

  const liveFeedItems = useMemo(() => {
    const baseItems = data.currentOrders.slice(0, 25).map((order) => {
      const status = String(order.restaurantStatus || "").toLowerCase();
      const paymentStatus = String(order.paymentStatus || "").toLowerCase();
      let type = "Orders";
      let label = `Order #${order.orderId} is ${status || "processing"}`;
      let priority = "medium";
      if (["rejected", "cancelled"].includes(status)) {
        type = "Orders";
        label = `Cancellation: Order #${order.orderId}`;
        priority = "high";
      } else if (paymentStatus.includes("fail")) {
        type = "Payments";
        label = `Payment failed for #${order.orderId}`;
        priority = "high";
      } else if (status === "new") {
        type = "Orders";
        label = `New order received #${order.orderId}`;
        priority = "medium";
      } else if (status === "accepted") {
        type = "Restaurants";
        label = `Restaurant accepted #${order.orderId}`;
        priority = "low";
      } else if (String(order.deliveryPartnerStatus || "").toLowerCase() === "delivered") {
        type = "Customers";
        label = `Delivery completed for #${order.orderId}`;
        priority = "low";
      }
      return {
        id: order.orderId || order.id,
        orderId: order.orderId,
        type,
        label,
        priority,
        at: getOrderDate(order)?.toLocaleString() || "Recently",
      };
    });
    return baseItems.filter((item) => (activityTab === "System" ? item.priority === "high" : item.type === activityTab));
  }, [activityTab, data.currentOrders]);

  const insights = useMemo(() => {
    const cancellationDiff = percentDiff(currentMetrics.cancelledOrders, previousMetrics.cancelledOrders);
    const revenueDiff = percentDiff(currentMetrics.totalRevenue, previousMetrics.totalRevenue);
    const peakHour = hourlyOrdersData.reduce((best, current) => (current.orders > best.orders ? current : best), { hour: "-", orders: 0 });
    return [
      {
        id: "insight-cancel",
        text: `Order cancellations ${cancellationDiff >= 0 ? "increased" : "decreased"} ${Math.abs(cancellationDiff).toFixed(1)}% in selected range.`,
      },
      {
        id: "insight-peak",
        text: `Peak traffic observed around ${peakHour.hour} with ${peakHour.orders} orders.`,
      },
      {
        id: "insight-revenue",
        text: `Revenue ${revenueDiff >= 0 ? "grew" : "fell"} ${Math.abs(revenueDiff).toFixed(1)}% compared to previous period.`,
      },
      {
        id: "insight-alert",
        text: `${currentMetrics.failedPayments} payment failures need operational review.`,
      },
    ];
  }, [currentMetrics.cancelledOrders, currentMetrics.failedPayments, currentMetrics.totalRevenue, hourlyOrdersData, previousMetrics.cancelledOrders, previousMetrics.totalRevenue]);

  const earningsSnapshot = useMemo(() => {
    const buckets = {
      today: 0,
      yesterday: 0,
      week: 0,
      month: 0,
      year: 0,
    };
    const nowDate = new Date();
    const todayStr = formatDate(nowDate);
    const yesterday = new Date(nowDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    data.currentOrders.forEach((order) => {
      const orderDate = getOrderDate(order);
      if (!orderDate) return;
      const revenue = getRevenueFromOrder(order);
      const orderDateStr = formatDate(orderDate);
      if (orderDateStr === todayStr) buckets.today += revenue;
      if (orderDateStr === yesterdayStr) buckets.yesterday += revenue;

      const dayDiff = Math.floor((nowDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff <= 7) buckets.week += revenue;
      if (orderDate.getMonth() === nowDate.getMonth() && orderDate.getFullYear() === nowDate.getFullYear()) buckets.month += revenue;
      if (orderDate.getFullYear() === nowDate.getFullYear()) buckets.year += revenue;
    });

    const avgOrderValue = data.currentOrders.length ? buckets.month / data.currentOrders.length : 0;
    const projectedRevenue = buckets.month * 1.1;

    return { ...buckets, avgOrderValue, projectedRevenue };
  }, [data.currentOrders]);

  const kpiCards = useMemo(() => {
    const revenueGrowth = percentDiff(currentMetrics.totalRevenue, previousMetrics.totalRevenue);
    const orderGrowth = percentDiff(currentMetrics.totalOrders, previousMetrics.totalOrders);
    return [
      {
        title: "Total Earnings",
        value: `₹${Math.round(currentMetrics.totalRevenue).toLocaleString()}`,
        change: revenueGrowth,
        compareText: "vs previous period",
        link: "/analytics",
        icon: BadgeIndianRupee,
      },
      {
        title: "Total Orders",
        value: currentMetrics.totalOrders.toLocaleString(),
        change: orderGrowth,
        compareText: "vs previous period",
        link: "/orders",
        icon: ClipboardList,
      },
      {
        title: "Active Orders",
        value: currentMetrics.activeOrders.toLocaleString(),
        change: percentDiff(currentMetrics.activeOrders, previousMetrics.activeOrders),
        compareText: "live operational load",
        link: "/orders",
        icon: Zap,
      },
      {
        title: "Cancelled Orders",
        value: currentMetrics.cancelledOrders.toLocaleString(),
        change: percentDiff(currentMetrics.cancelledOrders, previousMetrics.cancelledOrders),
        compareText: "requires action",
        link: "/orders",
        icon: CircleAlert,
      },
      {
        title: "Refund Amount",
        value: `₹${Math.round(currentMetrics.refundAmount).toLocaleString()}`,
        change: percentDiff(currentMetrics.refundAmount, previousMetrics.refundAmount),
        compareText: "refund trend",
        link: "/orders",
        icon: AlertCircle,
      },
      {
        title: "Avg Delivery Time",
        value: `${currentMetrics.avgDeliveryTime ? currentMetrics.avgDeliveryTime.toFixed(1) : "0.0"} min`,
        change: percentDiff(currentMetrics.avgDeliveryTime, previousMetrics.avgDeliveryTime),
        compareText: "service speed trend",
        link: "/live-tracking",
        icon: Truck,
      },
    ];
  }, [currentMetrics.activeOrders, currentMetrics.avgDeliveryTime, currentMetrics.cancelledOrders, currentMetrics.refundAmount, currentMetrics.totalOrders, currentMetrics.totalRevenue, previousMetrics.activeOrders, previousMetrics.avgDeliveryTime, previousMetrics.cancelledOrders, previousMetrics.refundAmount, previousMetrics.totalOrders, previousMetrics.totalRevenue]);

  const quickActions = [
    { label: "Add Restaurant", route: "/restaurants", icon: Store, visible: !restaurantAdmin },
    { label: "Add Offer", route: "/offers", icon: Tag, visible: true },
    // { label: "Broadcast Notification", route: "/notifications", icon: Sparkles, visible: !restaurantAdmin },
    { label: "View Live Orders", route: "/live-tracking", icon: ClipboardList, visible: true },
    { label: "Review Approvals", route: "/bookings/approval", icon: CalendarDays, visible: true },
  ];

  const dateRangeLabel = `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`;
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const adminLabel = restaurantAdmin ? "Restaurant Admin" : "Admin";

  return (
    <div className="min-h-screen bg-[#F6F8FB] p-4 md:p-6 lg:p-8">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">{greeting}, {adminLabel}</h1>
            {/* <p className="text-sm font-medium text-slate-500">
              {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {now.toLocaleTimeString()}
            </p> */}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setFilters((prev) => ({ ...prev, preset: preset.id, customStart: "", customEnd: "" }))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  mergedFilters.preset === preset.id && !mergedFilters.customStart && !mergedFilters.customEnd
                    ? "bg-indigo-500 text-white shadow-sm shadow-indigo-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div> */}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            type="date"
            value={mergedFilters.customStart}
            onChange={(e) => setFilters((prev) => ({ ...prev, customStart: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          />
          <input
            type="date"
            value={mergedFilters.customEnd}
            onChange={(e) => setFilters((prev) => ({ ...prev, customEnd: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          />
          <button
            onClick={() => setFilters((prev) => ({ ...prev, customStart: "", customEnd: "" }))}
            className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Clear Manual Range
          </button>
        </div>

        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Date Range</p>
          <p className="mt-1 font-bold">{dateRangeLabel}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((card) => {
          const positive = card.change >= 0;
          const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;
          return (
            <button
              key={card.title}
              onClick={() => navigate(card.link)}
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-red-50 p-2 text-red-500">
                  <card.icon size={18} />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">Live</span>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{card.title}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{card.value}</p>
              <div className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                <TrendIcon size={14} /> {Math.abs(card.change).toFixed(1)}% {card.compareText}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Revenue Analytics</h2>
            <p className="text-xs text-slate-500">Line + area trend based on selected range</p>
            <div className="mt-4 h-72">
              {!chartsReady || loading ? (
                <div className="h-full animate-pulse rounded-2xl bg-slate-100" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="sales" stroke="#ef4444" fill="url(#revenueFill)" strokeWidth={2} />
                    <Line type="monotone" dataKey="sales" stroke="#b91c1c" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Orders Analytics</h3>
              <p className="text-xs text-slate-500">Completed vs cancelled</p>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersMixData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
           <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Cuisine Analytics</h3>
              <p className="text-xs text-slate-500">Category performance</p>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cuisinePerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#14b8a6" />
                    <Bar dataKey="revenue" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Earnings Analytics</h3>
              <p className="text-xs text-slate-500">Day/week/month/year comparison snapshot</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-xs text-slate-500">Today</p><p className="font-bold">₹{Math.round(earningsSnapshot.today).toLocaleString()}</p></div>
                <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-xs text-slate-500">Yesterday</p><p className="font-bold">₹{Math.round(earningsSnapshot.yesterday).toLocaleString()}</p></div>
                <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-xs text-slate-500">Weekly</p><p className="font-bold">₹{Math.round(earningsSnapshot.week).toLocaleString()}</p></div>
                <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-xs text-slate-500">Monthly</p><p className="font-bold">₹{Math.round(earningsSnapshot.month).toLocaleString()}</p></div>
                <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-xs text-slate-500">Yearly</p><p className="font-bold">₹{Math.round(earningsSnapshot.year).toLocaleString()}</p></div>
                <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-xs text-slate-500">Projected</p><p className="font-bold">₹{Math.round(earningsSnapshot.projectedRevenue).toLocaleString()}</p></div>
                <div className="col-span-2 rounded-xl bg-slate-50 p-2.5"><p className="text-xs text-slate-500">Average Order Value</p><p className="font-bold">₹{Math.round(earningsSnapshot.avgOrderValue).toLocaleString()}</p></div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Restaurant Analytics</h3>
              <p className="text-xs text-slate-500">Top and low performers</p>
              <div className="mt-3 space-y-2">
                {topRestaurants.slice(0, 6).map((r, index) => (
                  <div key={`${r.name}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-700">{r.name || `Restaurant ${index + 1}`}</span>
                    <span className="font-bold text-slate-900">₹{Math.round(num(r.revenue)).toLocaleString()}</span>
                  </div>
                ))}
                {!topRestaurants.length && <p className="text-sm text-slate-500">No restaurant analytics for selected range.</p>}
              </div>
            </div>
            {/* <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Cuisine Analytics</h3>
              <p className="text-xs text-slate-500">Category performance</p>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cuisinePerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#14b8a6" />
                    <Bar dataKey="revenue" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div> */}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Real-Time Activity Feed</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {FEED_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActivityTab(tab)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${activityTab === tab ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
              {liveFeedItems.length ? (
                liveFeedItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.orderId && navigate(`/orders/${item.orderId}`)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition hover:shadow-sm ${
                      item.priority === "high" ? "border-rose-200 bg-rose-50/60" : item.priority === "medium" ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-[11px] font-medium text-slate-500">{item.at}</p>
                  </button>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No live events in this stream.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Operational Insights</h3>
            <div className="mt-3 space-y-2">
              {insights.map((insight) => (
                <div key={insight.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  {insight.text}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Quick Actions</h3>
            <div className="mt-3 space-y-2">
              {quickActions
                .filter((action) => action.visible)
                .map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.route)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                  >
                    <span className="inline-flex items-center gap-2">
                      <action.icon size={15} className="text-slate-500" />
                      {action.label}
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Platform Activity</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Total Customers</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{restaurantAdmin ? currentMetrics.uniqueCustomers.size : data.totalCustomers.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Online Executives</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{data.onlineExecutives.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Pending Bookings</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{data.pendingBookings.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Pending Offers</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{data.pendingOffers.toLocaleString()}</p>
              </div>
              {!restaurantAdmin && (
                <>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Active Restaurants</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{num(data.restaurantStats.activeCount || data.restaurantStats.active).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Total Executives</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{data.totalExecutives.toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
