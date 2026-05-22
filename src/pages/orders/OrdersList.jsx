import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, RefreshCw, Calendar, X, AlertTriangle, Bell, Clock, Radio } from "lucide-react";
import { getAllOrders, getOrderStats, getOrderMonitoringStats, updateDeliveryStatusByAdmin } from "../../services/api";
import { saveAs } from "file-saver";
import { useOrderNotifications } from "../../context/OrderNotificationContext";
import { getCurrentRestaurantUid, isRestaurantAdmin } from "../../utils/auth";

const notificationSound = `${import.meta.env.BASE_URL}notification.mp3`;
const loudNotificationSound = `${import.meta.env.BASE_URL}loudNotificationSound.mpeg`;
const ORDER_POLL_INTERVAL = 5000;
const TOAST_DURATION = 9000;
const HIGHLIGHT_DURATION = 20000;
const EXIT_ANIMATION_DURATION = 350;
const LOUD_SOUND_DELAY = 10000;

const debug = (msg, ...args) => {
  if (import.meta.env.DEV) {
    console.log(`[OrdersPoll] ${msg}`, ...args);
  }
};

const OrdersList = () => {
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();
  const ownRestaurantUid = getCurrentRestaurantUid();
  const [allOrders, setAllOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const PAGE_SIZE = 10;
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
  });
  const [stats, setStats] = useState({
    all: 0,
    active: 0,
    pending: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const knownOrderIds = useRef(new Set());
  const knownOrderStatuses = useRef(new Map());
  const notifiedOrderIds = useRef(new Set());
  const audioRef = useRef(null);
  const loudAudioRef = useRef(null);
  const audioUnlocked = useRef(false);
  const loudSoundTimerRef = useRef(null);
  const loudSoundPlayedRef = useRef(false);
  const pollOrdersRef = useRef(null);
  const isPollingRef = useRef(false);

  const highlightedOrderIds = useRef(new Set());
  const highlightTimers = useRef(new Map());
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const toastIdCounter = useRef(0);
  const [toasts, setToasts] = useState([]);
  const soundPlayedThisCycle = useRef(false);
  const initialFetchRef = useRef(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);
  const [lastUpdatedAgo, setLastUpdatedAgo] = useState(null);
  const [notifPermission, setNotifPermission] = useState("default");
  const [liveConnected, setLiveConnected] = useState(true);
  const pollStartTime = useRef(null);
  const hasInteracted = useRef(false);

  const { resetUnreadOrders, addNewOrders, addNewOrderNotification } = useOrderNotifications();

  const orderBelongsToOwnRestaurant = useCallback((order) => {
    if (!restaurantAdmin || !ownRestaurantUid) return true;
    return (
      order.restaurant_uid === ownRestaurantUid ||
      order.restaurantUid === ownRestaurantUid ||
      order.restaurant_id === ownRestaurantUid ||
      order.restaurantId === ownRestaurantUid ||
      order.restaurant?.uid === ownRestaurantUid ||
      order.restaurant?.id === ownRestaurantUid
    );
  }, [restaurantAdmin, ownRestaurantUid]);

  useEffect(() => {
    hasInteracted.current = false;
    resetUnreadOrders();
  }, []);

  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
      if (Notification.permission === "default") {
        const requestHandler = () => {
          Notification.requestPermission().then(perm => {
            setNotifPermission(perm);
            document.removeEventListener("click", requestHandler);
          });
        };
        document.addEventListener("click", requestHandler);
      }
    }
  }, []);

  useEffect(() => {
    if (!lastUpdatedTime) return;
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - lastUpdatedTime) / 1000);
      setLastUpdatedAgo(secs);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedTime]);

  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    audioRef.current.preload = 'auto';
    loudAudioRef.current = new Audio(loudNotificationSound);
    loudAudioRef.current.preload = 'auto';
    const unlock = () => {
      if (!audioUnlocked.current) {
        Promise.all([
          audioRef.current.play().then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; }).catch(() => {}),
          loudAudioRef.current.play().then(() => { loudAudioRef.current.pause(); loudAudioRef.current.currentTime = 0; }).catch(() => {})
        ]).then(() => {
          audioUnlocked.current = true;
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
        });
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  const shouldNotifyByStatus = useCallback((order) => {
    const id = order.orderId || order.id;
    if (notifiedOrderIds.current.has(id)) return false;
    const status = (order.restaurantStatus || order.status || '').toUpperCase();
    return status === 'NEW' || status === 'PENDING_PAYMENT' || status === 'PENDING' || status === 'ACCEPTED';
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && audioUnlocked.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch (e) {
        console.warn("[Sound] playback error:", e);
      }
    }
  }, []);

  const playLoudNotificationSound = useCallback(() => {
    if (loudAudioRef.current && audioUnlocked.current && !loudSoundPlayedRef.current) {
      try {
        loudAudioRef.current.currentTime = 0;
        loudAudioRef.current.play().catch(() => {});
        loudSoundPlayedRef.current = true;
      } catch (e) {
        console.warn("[Loud Sound] playback error:", e);
      }
    }
  }, []);

  const cancelLoudSoundTimer = useCallback(() => {
    if (loudSoundTimerRef.current) {
      clearTimeout(loudSoundTimerRef.current);
      loudSoundTimerRef.current = null;
    }
  }, []);

  const scheduleLoudSound = useCallback(() => {
    cancelLoudSoundTimer();
    loudSoundPlayedRef.current = false;
    loudSoundTimerRef.current = setTimeout(() => {
      playLoudNotificationSound();
      loudSoundTimerRef.current = null;
    }, LOUD_SOUND_DELAY);
  }, [cancelLoudSoundTimer, playLoudNotificationSound]);

  const showDesktopNotification = useCallback((orders) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (document.visibilityState !== "hidden") return;
    const count = orders.length;
    const first = orders[0];
    const title = count === 1
      ? `New Order #${first.orderId}`
      : `${count} New Orders Received`;
    const body = count === 1
      ? `${first.customer_name || "Guest"} - ${first.restaurant_name || "Unknown"} - ₹${first.price}`
      : `${first.customer_name || "Guest"} and ${count - 1} other${count - 1 > 1 ? 's' : ''}`;
    try {
      const notif = new Notification(title, {
        body,
        icon: `${import.meta.env.BASE_URL}logo.png`,
        tag: "new-order",
        silent: true,
      });
      notif.onclick = () => {
        window.focus();
        navigate("/orders");
        notif.close();
      };
    } catch (e) {
      console.warn("[DesktopNotif] error:", e);
    }
  }, [navigate]);

  const addToast = useCallback((order) => {
    const id = ++toastIdCounter.current;
    const toast = {
      id,
      orderId: order.orderId,
      customerName: order.customer_name || order.customer || "Guest",
      restaurantName: order.restaurant_name || "Unknown Restaurant",
      amount: order.price,
      time: order.time || order.createdAt,
      createdAt: Date.now(),
      exiting: false,
    };
    setToasts(prev => [toast, ...prev]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, EXIT_ANIMATION_DURATION);
    }, TOAST_DURATION);
  }, []);

  const dismissToast = useCallback((id) => {
    cancelLoudSoundTimer();
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, EXIT_ANIMATION_DURATION);
  }, [cancelLoudSoundTimer]);

  const highlightNewOrders = useCallback((newOrderList) => {
    const newIds = [];
    newOrderList.forEach(order => {
      const id = order.orderId || order.id;
      if (!highlightedOrderIds.current.has(id)) {
        highlightedOrderIds.current.add(id);
        newIds.push(id);
        const timer = setTimeout(() => {
          highlightedOrderIds.current.delete(id);
          highlightTimers.current.delete(id);
          setHighlightedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, HIGHLIGHT_DURATION);
        highlightTimers.current.set(id, timer);
      }
    });
    if (newIds.length > 0) {
      setHighlightedIds(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, []);

  const removeHighlight = useCallback((id) => {
    highlightedOrderIds.current.delete(id);
    if (highlightTimers.current.has(id)) {
      clearTimeout(highlightTimers.current.get(id));
      highlightTimers.current.delete(id);
    }
    setHighlightedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      cancelLoudSoundTimer();
      highlightTimers.current.forEach(timer => clearTimeout(timer));
      highlightTimers.current.clear();
      highlightedOrderIds.current.clear();
    };
  }, [cancelLoudSoundTimer]);

  const pollOrders = async () => {
    if (isPollingRef.current) {
      debug('skip — previous poll still in flight');
      return;
    }
    isPollingRef.current = true;
    soundPlayedThisCycle.current = false;
    try {
      const params = {
        search: searchTerm,
        startDate: startDate,
        endDate: endDate,
        ...(restaurantAdmin && ownRestaurantUid ? { restaurant_uid: ownRestaurantUid } : {}),
      };
      const res = await getAllOrders(params);
      const newOrders = (res.data || []).filter(orderBelongsToOwnRestaurant);

      const newIds = new Set(newOrders.map(o => o.orderId || o.id));
      const hasNewOrder = knownOrderIds.current.size > 0 &&
        [...newIds].some(id => !knownOrderIds.current.has(id));

      let newlyArrived = [];
      let statusBasedNew = [];

      if (hasNewOrder) {
        newlyArrived = newOrders.filter(o => !knownOrderIds.current.has(o.orderId || o.id));
        debug('new order(s) detected:', newlyArrived.length);

        if (!soundPlayedThisCycle.current) {
          playNotificationSound();
          scheduleLoudSound();
          soundPlayedThisCycle.current = true;
        }

        newlyArrived.forEach(order => {
          addToast(order);
          addNewOrderNotification(order);
          notifiedOrderIds.current.add(order.orderId || order.id);
        });
        addNewOrders(newlyArrived);
        highlightNewOrders(newlyArrived);
        showDesktopNotification(newlyArrived);
      }

      statusBasedNew = newOrders.filter(o => shouldNotifyByStatus(o));
      statusBasedNew.forEach(order => {
        notifiedOrderIds.current.add(order.orderId || order.id);
        addNewOrderNotification(order);
        const prevStatus = knownOrderStatuses.current.get(order.orderId || order.id);
        if (prevStatus !== undefined && !soundPlayedThisCycle.current) {
          playNotificationSound();
          scheduleLoudSound();
          soundPlayedThisCycle.current = true;
        }
      });

      knownOrderIds.current = newIds;
      newOrders.forEach(o => knownOrderStatuses.current.set(o.orderId || o.id, (o.restaurantStatus || o.status || '').toUpperCase()));

      setAllOrders(newOrders);
      const filterFn = statusFilters[activeTab] || statusFilters.All;
      setOrders(newOrders.filter(filterFn));
      const totalPages = Math.ceil(newOrders.length / PAGE_SIZE);
      setPagination((prev) => ({
        ...prev,
        totalOrders: newOrders.length,
        totalPages,
        currentPage: Math.min(prev.currentPage, totalPages) || 1,
      }));

      setLastUpdatedTime(Date.now());
      setLiveConnected(true);
      pollStartTime.current = Date.now();

      if (restaurantAdmin) {
        setStats(computeStats(newOrders));
      } else {
        const statsRes = await getOrderMonitoringStats();
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Error polling orders:", err);
      setLiveConnected(false);
    } finally {
      isPollingRef.current = false;
    }
  };

  pollOrdersRef.current = pollOrders;

  const CANCEL_REASONS = [
    "Customer requested cancellation",
    "Restaurant closed/unavailable",
    "Delivery executive unavailable",
    "Order cannot be fulfilled",
    "Payment failed",
    "Suspected fraud",
    "Duplicate order",
    "Other"
  ];

  useEffect(() => {
    fetchStats();
    fetchOrders();
    hasInteracted.current = true;
    initialFetchRef.current = true;
    resetUnreadOrders();
  }, [activeTab]);

  useEffect(() => {
    if ((startDate && endDate) || (!startDate && !endDate)) {
      if (initialFetchRef.current && !startDate && !endDate) return;
      fetchOrders();
    }
  }, [startDate, endDate]);

  const fetchStats = async () => {
    if (restaurantAdmin) {
      setLoadingStats(false);
      return;
    }

    try {
      const res = await getOrderMonitoringStats();
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const computeStats = (orders) => ({
    all: orders.length,
    active: orders.filter(o => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes((o.restaurantStatus || o.status || '').toUpperCase())).length,
    pending: orders.filter(o => ['NEW', 'PENDING', 'PENDING_PAYMENT'].includes((o.restaurantStatus || o.status || '').toUpperCase())).length,
    delivered: orders.filter(o => ['DELIVERED', 'COMPLETED'].includes((o.restaurantStatus || o.status || '').toUpperCase())).length,
    cancelled: orders.filter(o => (o.restaurantStatus || o.status || '').toUpperCase() === 'CANCELLED').length,
  });

  const statusFilters = {
    All: () => true,
    Active: (o) => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes((o.restaurantStatus || o.status || '').toUpperCase()),
    Pending: (o) => ['NEW', 'PENDING', 'PENDING_PAYMENT'].includes((o.restaurantStatus || o.status || '').toUpperCase()),
    Delivered: (o) => ['DELIVERED', 'COMPLETED'].includes((o.restaurantStatus || o.status || '').toUpperCase()),
    Cancelled: (o) => (o.restaurantStatus || o.status || '').toUpperCase() === 'CANCELLED',
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        startDate: startDate,
        endDate: endDate,
        ...(restaurantAdmin && ownRestaurantUid ? { restaurant_uid: ownRestaurantUid } : {}),
      };

      const res = await getAllOrders(params);
      const fetched = (res.data || []).filter(orderBelongsToOwnRestaurant);
      setAllOrders(fetched);

      const filterFn = statusFilters[activeTab] || statusFilters.All;
      const filtered = fetched.filter(filterFn);
      setOrders(filtered);

      setStats(computeStats(fetched));

      const newStatusOrders = fetched.filter(o => shouldNotifyByStatus(o));
      newStatusOrders.forEach(order => {
        notifiedOrderIds.current.add(order.orderId || order.id);
        addNewOrderNotification(order);
      });

      knownOrderIds.current = new Set(fetched.map(o => o.orderId || o.id));
      fetched.forEach(o => knownOrderStatuses.current.set(o.orderId || o.id, (o.restaurantStatus || o.status || '').toUpperCase()));
      setLastUpdatedTime(Date.now());

      setPagination((prev) => ({
        ...prev,
        totalOrders: fetched.length,
        totalPages: Math.ceil(fetched.length / PAGE_SIZE),
        currentPage: 1
      }));
    } catch (err) {
      console.error("Error fetching orders:", err);
      setAllOrders([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pollOrdersRef.current?.();
      } else {
        debug('tab hidden — poll skipped');
      }
    }, ORDER_POLL_INTERVAL);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debug('tab became visible — immediate refresh');
        pollOrdersRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    debug(`polling started (interval=${ORDER_POLL_INTERVAL}ms)`);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      debug('polling stopped');
    };
  }, []);

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      resetUnreadOrders();
      fetchOrders();
    }
  };

  const handleOpenCancelModal = (order) => {
    setSelectedOrderForCancel(order);
    setShowCancelModal(true);
    setCancelReason("");
    setOtherReason("");
  };

  const handleCancelOrder = async () => {
    const finalReason = cancelReason === "Other" ? otherReason : cancelReason;
    if (!finalReason.trim()) {
      alert("Please select or enter a reason for cancellation");
      return;
    }

    setIsCancelling(true);
    try {
      await updateDeliveryStatusByAdmin(selectedOrderForCancel.orderId, "admin_cancelled", finalReason);
      setShowCancelModal(false);
      setSelectedOrderForCancel(null);
      setCancelReason("");
      setOtherReason("");
      alert("Order cancelled successfully!");
      fetchOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert(error.response?.data?.message || "Failed to cancel order. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExport = () => {
    if (!orders.length) {
      alert("No data to export");
      return;
    }

    const csvContent = [
      ["Order ID", "Customer", "Restaurant", "Order Time", "Total Amount", "Status", "Delivery Executive"],
      ...orders.map((o) => [
        o.id,
        o.user?.name || "N/A",
        getRestaurantName(o),
        (() => { const ft = formatOrderTime(o.createdAt); return ft ? `${ft.date} ${ft.time}` : "N/A"; })(),
        `₹${o.totalAmount}`,
        o.status,
        o.partner?.fullName || "Awaiting Assignment",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `orders-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const getRestaurantName = (order) => {
    if (order.cart?.items?.[0]?.food?.restaurant?.rest_name) {
      return order.cart.items[0].food.restaurant.rest_name;
    }
    return "N/A";
  };

  const formatOrderTime = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const time = date.toLocaleString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    });
    const datePart = date.toLocaleString("en-IN", {
      day: "2-digit", month: "short",
    });
    return { time, date: datePart };
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "now";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h`;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      NEW: { label: "New", color: "bg-amber-50 text-amber-700 border border-amber-200" },
      PENDING: { label: "Pending", color: "bg-orange-50 text-orange-700 border border-orange-200" },
      DELIVERED: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
      CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-700 border border-red-200" },
      ACCEPTED: { label: "Accepted", color: "bg-blue-50 text-blue-700 border border-blue-200" },
      IN_PROGRESS: { label: "In Progress", color: "bg-blue-50 text-blue-700 border border-blue-200" },
      PENDING_PAYMENT: { label: "Pending", color: "bg-orange-50 text-orange-700 border border-orange-200" },
      COMPLETED: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    };

    const info = statusMap[status] || {
      label: status,
      color: "bg-gray-50 text-gray-600 border border-gray-200",
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold leading-tight tracking-wide ${info.color}`}>
        {info.label}
      </span>
    );
  };

  const getLastUpdatedText = () => {
    if (lastUpdatedAgo === null) return "";
    if (lastUpdatedAgo < 3) return "Just now";
    if (lastUpdatedAgo < 60) return `${lastUpdatedAgo}s ago`;
    const mins = Math.floor(lastUpdatedAgo / 60);
    return `${mins}m ${lastUpdatedAgo % 60}s ago`;
  };

  const tabs = [
    { label: "All Orders", value: "All", count: stats.all },
    { label: "Active Orders", value: "Active", count: stats.active },
    { label: "Pending", value: "Pending", count: stats.pending },
    { label: "Delivered", value: "Delivered", count: stats.delivered },
    { label: "Cancelled", value: "Cancelled", count: stats.cancelled },
  ];

  const handleClearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleRefresh = () => {
    resetUnreadOrders();
    fetchOrders();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const startIndex = (pagination.currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Order Monitoring</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
            <span className={`w-2 h-2 rounded-full ${liveConnected ? 'bg-green-500 animate-live-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs font-semibold text-green-700 tracking-wide">LIVE</span>
          </div>
          {lastUpdatedTime && (
            <div className="flex items-center gap-1 text-xs text-gray-400 ml-1">
              <Clock size={12} />
              <span>{getLastUpdatedText()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                handleTabChange(tab.value);
              }}
              className={`px-4 py-2 rounded-full font-medium text-sm transition ${activeTab === tab.value
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {tab.label} <span className="ml-1">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="p-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by Order ID, Customer, Restaurant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>

          <button
            onClick={() => document.getElementById('dateRangeModal').classList.toggle('hidden')}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm"
          >
            <Calendar size={16} /> Date Range
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm"
          >
            <Download size={16} /> Export
          </button>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm"
            title="Refresh orders"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div id="dateRangeModal" className="hidden px-6 pb-4">
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <span className="text-gray-400 mt-6">to</span>
            <div>
              <label className="text-xs text-gray-600 block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <button
              onClick={() => {
                fetchOrders();
                document.getElementById('dateRangeModal').classList.add('hidden');
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm mt-6"
            >
              Apply
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm mt-6"
            >
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No orders found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="sticky top-0 z-10">
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-sm border-b border-gray-100">
                      Order ID
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-sm border-b border-gray-100">
                      Customer
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-sm border-b border-gray-100 hidden md:table-cell">
                      Restaurant
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-sm border-b border-gray-100">
                      Time
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-sm border-b border-gray-100">
                      Amount
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-sm border-b border-gray-100">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-sm border-b border-gray-100 hidden lg:table-cell">
                      Executive
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-sm border-b border-gray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedOrders.map((order, index) => {
                    const orderId = order.orderId || order.id;
                    const isHighlighted = highlightedIds.has(orderId);
                    const timeObj = formatOrderTime(order.time);
                    const customerInitial = (order.customer_name || order.customer || "G").charAt(0).toUpperCase();
                    return (
                      <tr
                        key={orderId || index}
                        className={`
                          group transition-all duration-150
                          hover:bg-gray-50/80
                          ${isHighlighted ? 'animate-pulse-glow' : ''}
                          ${index === 0 && isHighlighted ? 'animate-row-slide-in' : ''}
                        `}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {isHighlighted && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-live-pulse flex-shrink-0" />
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-xs font-mono font-semibold text-gray-800 group-hover:bg-gray-100 transition-colors">
                              #{order.orderId}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
                              {customerInitial}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 leading-tight">
                                {order.customer_name || order.customer || "Guest"}
                              </p>
                              <p className="text-[11px] text-gray-400 leading-tight mt-0.5 hidden sm:block">
                                {order.restaurant_name || "Unknown Restaurant"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">
                          <p className="truncate max-w-[140px]">{order.restaurant_name || "—"}</p>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-800 leading-tight">{timeObj?.time || "—"}</span>
                            <span className="text-[11px] text-gray-400 leading-tight mt-0.5">{timeObj?.date || ""}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-bold text-gray-900 tabular-nums">₹{order.price}</span>
                        </td>

                        <td className="px-5 py-3.5">
                          {getStatusBadge(order.restaurantStatus?.toUpperCase())}
                        </td>

                        <td className="px-5 py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                          <span className="text-sm">{order.deliveryPartnerStatus || "—"}</span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/orders/${order.orderId}`)}
                              className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-md transition-all duration-150"
                            >
                              View
                            </button>
                            {!restaurantAdmin && order.restaurantStatus?.toUpperCase() !== 'CANCELLED' && order.restaurantStatus?.toUpperCase() !== 'DELIVERED' && order.restaurantStatus?.toUpperCase() !== 'COMPLETED' && order.status?.toUpperCase() !== 'COMPLETED' && (
                              <button
                                onClick={() => handleOpenCancelModal(order)}
                                className="px-2 py-1 text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-md transition-all duration-150"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-gray-600">
                Showing {pagination.totalOrders === 0 ? 0 : startIndex + 1}-
                {Math.min(endIndex, pagination.totalOrders)} of {pagination.totalOrders} orders
              </p>
              <div className="flex space-x-1">
                <button
                  disabled={pagination.currentPage === 1}
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ←
                </button>
                {[...Array(Math.min(pagination.totalPages, 5))].map((_, idx) => {
                  const page = idx + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setPagination((prev) => ({ ...prev, currentPage: page }))}
                      className={`px-3 py-1 rounded text-sm ${pagination.currentPage === page
                        ? "bg-red-500 text-white"
                        : "border hover:bg-gray-50"
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {toasts.length > 0 && (
        <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => { cancelLoudSoundTimer(); navigate(`/orders/${toast.orderId}`); }}
              className={`
                pointer-events-auto w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden cursor-pointer
                ${toast.exiting ? 'animate-toast-exit' : 'animate-toast-enter'}
              `}
              style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                  <Bell size={16} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-red-500 uppercase tracking-wide">New Order</p>
                    <button
                      onClick={() => dismissToast(toast.id)}
                      className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    #{toast.orderId}
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs text-gray-600">
                      <span className="text-gray-400">Customer:</span> {toast.customerName}
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className="text-gray-400">Restaurant:</span> {toast.restaurantName}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                      <p className="text-sm font-bold text-gray-900">₹{toast.amount}</p>
                      <p className="text-[10px] text-gray-400">
                        {(() => { const t = formatOrderTime(toast.time); return t ? `${t.time}, ${t.date}` : ""; })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-red-500 to-red-400 animate-pulse" style={{ width: '100%' }} />
            </div>
          ))}
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                Cancel Order
              </h3>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedOrderForCancel(null);
                  setCancelReason("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Order ID: <span className="font-semibold text-gray-900">#{selectedOrderForCancel?.orderId}</span></p>
                <p className="text-sm text-gray-600">Customer: <span className="font-semibold text-gray-900">{selectedOrderForCancel?.customer_name || 'Guest'}</span></p>
                <p className="text-sm text-gray-600">Amount: <span className="font-semibold text-gray-900">₹{selectedOrderForCancel?.price}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Select Reason --</option>
                  {CANCEL_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {cancelReason === "Other" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please specify reason
                  </label>
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Enter reason..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action will cancel the order and notify all parties (Customer, Restaurant, Delivery Executive).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedOrderForCancel(null);
                  setCancelReason("");
                  setOtherReason("");
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
                disabled={isCancelling}
              >
                Close
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!cancelReason.trim() || isCancelling}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
