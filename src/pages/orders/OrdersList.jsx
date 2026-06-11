import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Download, RefreshCw, Calendar, X, AlertTriangle, Bell, Clock,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  RotateCcw, Eye, Filter, ArrowUpDown, CheckSquare, Square, MoreVertical,
  Loader2, ChevronDown, ShoppingBag, IndianRupee, TrendingUp, TrendingDown,
  Ban, UtensilsCrossed, Bike, CreditCard, Radio, Trash2,
} from "lucide-react";
import {
  getAllOrders, getOrderMonitoringStats, updateDeliveryStatusByAdmin, exportOrders,
  deleteOrder, bulkDeleteOrders,
} from "../../services/api";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { useOrderNotifications } from "../../context/OrderNotificationContext";
import { getCurrentRestaurantUid, isRestaurantAdmin, isZenzioAdmin } from "../../utils/auth";
import { isRecentNotification } from "../../utils/notifications";

const HIGHLIGHT_DURATION = 20000;
const EXIT_ANIMATION_DURATION = 350;

const CANCEL_REASONS = [
  { label: "Delivery executive unavailable", value: "delivery_executive_unavailable" },
  { label: "Order cannot be fulfilled", value: "order_cannot_be_fulfilled" },
  { label: "Cancelled by admin", value: "cancelled_by_admin" },
  { label: "Customer requested cancellation", value: "customer_requested_cancellation" },
  { label: "Restaurant closed/unavailable", value: "restaurant_closed" },
  { label: "Payment failed", value: "payment_failed" },
  { label: "Suspected fraud", value: "suspected_fraud" },
  { label: "Duplicate order", value: "duplicate_order" },
  { label: "Other", value: "other" },
];

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const formatDateTime = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};


const StatusBadge = ({ status }) => {
  const statusMap = {
    NEW: { label: "New", color: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
    PENDING: { label: "Pending", color: "bg-orange-50 text-orange-700 ring-orange-600/20" },
    PENDING_PAYMENT: { label: "Pending Payment", color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
    ACCEPTED: { label: "Accepted", color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
    PREPARING: { label: "Preparing", color: "bg-sky-50 text-sky-700 ring-sky-600/20" },
    READY: { label: "Ready", color: "bg-cyan-50 text-cyan-700 ring-cyan-600/20" },
    PICKED_UP: { label: "Picked Up", color: "bg-purple-50 text-purple-700 ring-purple-600/20" },
    DELIVERED: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
    COMPLETED: { label: "Completed", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-700 ring-red-600/20" },
    REFUNDED: { label: "Refunded", color: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  };
  const s = (status || "").toUpperCase();
  const info = statusMap[s] || { label: s, color: "bg-gray-50 text-gray-600 ring-gray-600/20" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${info.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.color.includes("emerald") ? "bg-emerald-500" : info.color.includes("red") ? "bg-red-500" : info.color.includes("indigo") ? "bg-indigo-500" : info.color.includes("blue") ? "bg-blue-500" : info.color.includes("orange") ? "bg-orange-500" : info.color.includes("amber") ? "bg-amber-500" : info.color.includes("purple") ? "bg-purple-500" : info.color.includes("rose") ? "bg-rose-500" : info.color.includes("sky") ? "bg-sky-500" : info.color.includes("cyan") ? "bg-cyan-500" : "bg-gray-400"}`} />
      {info.label}
    </span>
  );
};

const PaymentStatusBadge = ({ status }) => {
  const map = {
    PAID: { label: "Paid", color: "bg-emerald-50 text-emerald-700" },
    SUCCESS: { label: "Paid", color: "bg-emerald-50 text-emerald-700" },
    CAPTURED: { label: "Paid", color: "bg-emerald-50 text-emerald-700" },
    PENDING: { label: "Pending", color: "bg-amber-50 text-amber-700" },
    PENDING_PAYMENT: { label: "Awaiting Payment", color: "bg-amber-50 text-amber-700" },
    FAILED: { label: "Failed", color: "bg-red-50 text-red-700" },
    REFUNDED: { label: "Refunded", color: "bg-rose-50 text-rose-700" },
  };
  const s = (status || "").toUpperCase();
  const info = map[s] || { label: s || "—", color: "bg-gray-50 text-gray-600" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${info.color}`}>{info.label}</span>;
};

const FilterDropdown = ({ label, icon: Icon, value, options, onChange, onClear }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150
          ${value && value !== "all"
            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
          }`}
      >
        {Icon && <Icon size={14} />}
        {value && value !== "all" ? options.find(o => o.value === value)?.label || label : label}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 z-50 py-1 overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors
                  ${value === opt.value
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {opt.label}
              </button>
            ))}
            {onClear && value && value !== "all" && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { onClear(); setOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50"
                >
                  Clear filter
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ActionMenu = ({ order, onView, onCancel, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isTerminal = ["DELIVERED", "COMPLETED", "CANCELLED"].includes((order.restaurantStatus || order.status || "").toUpperCase());

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Actions"
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 z-50 py-1 overflow-hidden"
          >
            {!onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onView(order); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Eye size={14} />
                View Details
              </button>
            )}
            {!isTerminal && onCancel && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onCancel(order); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <Ban size={14} />
                Cancel Order
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(order); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Delete Order
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, sub, trend, onClick, isActive }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3.5 transition-all duration-200 cursor-pointer
      ${isActive ? "border-indigo-300 ring-2 ring-indigo-200 bg-indigo-50/30" : "border-gray-100 hover:shadow-md hover:border-gray-200"}`}
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {(sub || trend) && (
        <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${trend?.startsWith("↑") ? "text-emerald-500" : trend?.startsWith("↓") ? "text-red-500" : "text-gray-400"}`}>
          {trend && (
            trend.startsWith("↑")
              ? <TrendingUp size={11} className="text-emerald-500" />
              : <TrendingDown size={11} className="text-red-500" />
          )}
          {trend || sub}
        </p>
      )}
    </div>
  </motion.div>
);

const MobileOrderCard = ({ order, onView, onCancel, onDelete, isHighlighted, confirmDeleteId, onDeleteConfirm, isDeleting }) => {
  const orderId = order.orderId || order.id;
  const customerInitial = (order.customer_name || order.customer || "G").charAt(0).toUpperCase();
  const isTerminal = ["DELIVERED", "COMPLETED", "CANCELLED"].includes((order.restaurantStatus || order.status || "").toUpperCase());
  const showingConfirm = confirmDeleteId === orderId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3 ${isHighlighted ? 'ring-2 ring-indigo-300 bg-indigo-50/20' : ''}`}
      onClick={() => { if (!showingConfirm) onView(order); }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {customerInitial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
              #{orderId}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusBadge status={order.restaurantStatus || order.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ActionMenu order={order} onView={onView} onCancel={onCancel} onDelete={onDelete} />
        </div>
      </div>
      {showingConfirm && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-red-700">Delete this order?</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onDeleteConfirm(null)}
              className="px-2 py-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isDeleting}
            >
              No
            </button>
            <button
              onClick={() => onDeleteConfirm(order)}
              disabled={isDeleting}
              className="px-2 py-1 text-[11px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
            >
              {isDeleting && <Loader2 size={10} className="animate-spin" />}
              {isDeleting ? '...' : 'Yes'}
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-gray-700">{order.customer_name || order.customer || "Guest"}</span>
          <span className="text-gray-400">{order.restaurant_name || "—"}</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-gray-900">₹{order.price}</span>
          <span className="block text-[10px] text-gray-400">{formatDateTime(order.createdAt || order.time)}</span>
        </div>
      </div>
    </motion.div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="w-10 h-10 rounded-lg bg-gray-100 animate-skeleton mb-3" />
          <div className="h-3 w-16 bg-gray-100 rounded animate-skeleton mb-2" />
          <div className="h-6 w-12 bg-gray-100 rounded animate-skeleton" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-gray-100 animate-skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-gray-100 rounded animate-skeleton" />
              <div className="h-3 w-32 bg-gray-100 rounded animate-skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const EmptyState = ({ searchTerm, hasActiveFilters, onReset }) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <ShoppingBag className="text-gray-400" size={28} />
    </div>
    <h3 className="text-base font-semibold text-gray-600 mb-1">
      {searchTerm || hasActiveFilters ? "No matching orders" : "No orders yet"}
    </h3>
    <p className="text-sm text-gray-400 max-w-xs mx-auto">
      {searchTerm || hasActiveFilters
        ? "Try adjusting your search or filter criteria"
        : "Orders will appear here once customers start placing them"}
    </p>
    {(searchTerm || hasActiveFilters) && (
      <button
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200"
      >
        <RefreshCw size={15} />
        Reset Filters
      </button>
    )}
  </div>
);

const OrdersList = () => {
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();
  const ownRestaurantUid = getCurrentRestaurantUid();
  const searchInputRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  const [stats, setStats] = useState({
    totalOrders: 0, activeOrders: 0, pendingOrders: 0,
    deliveredOrders: 0, cancelledOrders: 0,
    revenue: 0, avgOrderValue: 0, refundAmount: 0,
  });
  const [statsTrend, setStatsTrend] = useState({});

  const [statusFilter, setStatusFilter] = useState("all");
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [executiveFilter, setExecutiveFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [cityFilter, setCityFilter] = useState("all");

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");

  const [activeStatCard, setActiveStatCard] = useState("all");

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const highlightedOrderIds = useRef(new Set());
  const highlightTimers = useRef(new Map());
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const initialFetchRef = useRef(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);
  const [lastUpdatedAgo, setLastUpdatedAgo] = useState(null);

  const [liveConnected, setLiveConnected] = useState(false);
  const { socketConnected, resetUnreadOrders, registerNewOrderCallback } = useOrderNotifications();

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
    resetUnreadOrders();
  }, []);


  useEffect(() => {
    if (!lastUpdatedTime) return;
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - lastUpdatedTime) / 1000);
      setLastUpdatedAgo(secs);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedTime]);


  const highlightNewOrders = useCallback((newOrderList) => {
    const newIds = [];
    newOrderList.filter(isRecentNotification).forEach(order => {
      const id = order.orderId || order.id;
      if (!highlightedOrderIds.current.has(id)) {
        highlightedOrderIds.current.add(id);
        newIds.push(id);
        const timer = setTimeout(() => {
          highlightedOrderIds.current.delete(id);
          highlightTimers.current.delete(id);
          setHighlightedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        }, HIGHLIGHT_DURATION);
        highlightTimers.current.set(id, timer);
      }
    });
    if (newIds.length > 0) {
      setHighlightedIds(prev => { const n = new Set(prev); newIds.forEach(i => n.add(i)); return n; });
    }
  }, []);

  useEffect(() => {
    setLiveConnected(socketConnected);
  }, [socketConnected]);

  useEffect(() => {
    return () => {
      highlightTimers.current.forEach(t => clearTimeout(t));
      highlightTimers.current.clear();
      highlightedOrderIds.current.clear();
    };
  }, []);

  // ── Debounced Search ──
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Build API params ──
  const buildParams = useCallback(() => {
    const params = {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearch || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      ...(restaurantAdmin && ownRestaurantUid ? { restaurant_uid: ownRestaurantUid } : {}),
    };

    if (statusFilter !== "all") params.status = statusFilter;
    if (restaurantFilter !== "all") params.restaurant = restaurantFilter;
    if (customerFilter !== "all") params.customer = customerFilter;
    if (executiveFilter !== "all") params.executive = executiveFilter;
    if (paymentStatusFilter !== "all") params.paymentStatus = paymentStatusFilter;
    if (paymentMethodFilter !== "all") params.paymentMethod = paymentMethodFilter;
    if (orderTypeFilter !== "all") params.deliveryStatus = orderTypeFilter;
    if (dateFilter !== "all" && dateFilter !== "custom") {
      const now = Date.now();
      const ranges = { today: 0, yesterday: 86400000, last7: 7 * 86400000, last30: 30 * 86400000 };
      if (ranges[dateFilter] !== undefined) {
        params.fromDate = new Date(now - ranges[dateFilter]).toISOString();
        params.toDate = new Date().toISOString();
      }
    }
    if (dateFilter === "custom" && fromDate && toDate) {
      params.fromDate = new Date(fromDate).toISOString();
      params.toDate = new Date(toDate + "T23:59:59").toISOString();
    }
    if (amountMin) params.amountMin = Number(amountMin);
    if (amountMax) params.amountMax = Number(amountMax);
    if (cityFilter !== "all") params.city = cityFilter;

    console.log('API Request params:', params);
    return params;
  }, [currentPage, itemsPerPage, debouncedSearch, sortBy, sortOrder, statusFilter, restaurantFilter, customerFilter, executiveFilter, paymentStatusFilter, paymentMethodFilter, orderTypeFilter, dateFilter, fromDate, toDate, amountMin, amountMax, cityFilter, restaurantAdmin, ownRestaurantUid]);

  // ── Fetch Orders ──
  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = buildParams();
      const response = await getAllOrders(params);
      const data = response.data?.data || response.data || [];
      const meta = response.data?.meta || {};
      const fetched = Array.isArray(data) ? data.filter(orderBelongsToOwnRestaurant) : [];
      setOrders(fetched);
      if (meta?.total !== undefined) {
        setPagination({
          total: meta.total || fetched.length,
          page: meta.page || currentPage,
          limit: meta.limit || itemsPerPage,
          totalPages: meta.totalPages || Math.ceil((meta.total || fetched.length) / itemsPerPage),
        });
      } else {
        setPagination(prev => ({
          ...prev,
          total: fetched.length,
          totalPages: Math.ceil(fetched.length / itemsPerPage),
        }));
      }

      setLastUpdatedTime(Date.now());
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [buildParams, orderBelongsToOwnRestaurant, currentPage, itemsPerPage]);

  // ── Fetch Stats ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await getOrderMonitoringStats();
      const d = res.data?.data || res.data || {};
      setStats({
        totalOrders: d.totalOrders || d.all || 0,
        activeOrders: d.activeOrders || d.active || 0,
        pendingOrders: d.pendingOrders || d.pending || 0,
        deliveredOrders: d.deliveredOrders || d.delivered || 0,
        cancelledOrders: d.cancelledOrders || d.cancelled || 0,
        revenue: d.revenue || d.totalRevenue || 0,
        avgOrderValue: d.avgOrderValue || d.averageOrderValue || 0,
        refundAmount: d.refundAmount || d.totalRefund || 0,
      });
      if (d.trends) setStatsTrend(d.trends);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchOrders();
    initialFetchRef.current = true;
    resetUnreadOrders();
  }, [currentPage, itemsPerPage, debouncedSearch, sortBy, sortOrder,
      statusFilter, restaurantFilter, customerFilter, executiveFilter,
      paymentStatusFilter, paymentMethodFilter, orderTypeFilter,
      dateFilter, fromDate, toDate, amountMin, amountMax, cityFilter]);

  // When the global notification provider detects a new order (via polling or socket),
  // it calls this callback so the table can refresh and highlight the new rows.
  useEffect(() => {
    const unsubscribe = registerNewOrderCallback((newlyArrived) => {
      fetchOrders(true);
      fetchStats();
      highlightNewOrders(newlyArrived);
    });
    return unsubscribe;
  }, [registerNewOrderCallback, fetchOrders, fetchStats, highlightNewOrders]);

  // ── Actions ──
  const handleView = (order) => {
    const id = order.orderId || order.id;
    if (!id) { toast.error("Invalid order ID"); return; }
    navigate(`/orders/${id}`);
  };

  const handleOpenCancelModal = (order) => {
    setSelectedOrderForCancel(order);
    setShowCancelModal(true);
    setCancelReason("");
    setOtherReason("");
  };

  const handleCancelOrder = async () => {
    const finalStatus = cancelReason || "cancelled_by_admin";
    const finalReason = finalStatus === "other" && otherReason.trim() ? otherReason.trim() : CANCEL_REASONS.find(r => r.value === finalStatus)?.label || finalStatus;
    if (!finalReason.trim()) { toast.error("Please select or enter a reason"); return; }
    setIsCancelling(true);
    try {
      await updateDeliveryStatusByAdmin(selectedOrderForCancel.orderId, finalStatus, finalReason);
      toast.success("Order cancelled successfully");
      setShowCancelModal(false);
      setSelectedOrderForCancel(null);
      setCancelReason("");
      setOtherReason("");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  const zenzioAdmin = isZenzioAdmin();

  const handleDelete = async (order) => {
    const id = order.orderId || order.id;
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteOrder(id);
      toast.success("Order deleted successfully");
      setConfirmDeleteId(null);
      fetchOrders(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete order");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await bulkDeleteOrders(ids);
      toast.success(res.data?.message || `${ids.length} orders deleted`);
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      fetchOrders(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete orders");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatCardClick = (key) => {
    if (activeStatCard === key) {
      setActiveStatCard("all");
      setStatusFilter("all");
    } else {
      setActiveStatCard(key);
      const statusMap = {
        totalOrders: "all", activeOrders: "active",
        pendingOrders: "NEW", deliveredOrders: "COMPLETED",
        cancelledOrders: "CANCELLED",
      };
      const mappedStatus = statusMap[key] || "all";
      console.log('Stat card clicked:', { key, mappedStatus });
      setStatusFilter(mappedStatus);
      setCurrentPage(1);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(column);
      setSortOrder("DESC");
    }
    setCurrentPage(1);
  };

  const handleExport = async (exportAll = false) => {
    if (!orders.length && !exportAll) { toast.error("No data to export"); return; }
    setExportLoading(true);
    try {
      let data = orders;
      if (exportAll) {
        const params = buildParams();
        params.limit = 10000;
        const res = await getAllOrders(params);
        const raw = res.data?.data || res.data || [];
        data = Array.isArray(raw) ? raw : orders;
      }

      const COMMISSION_RATE = 0.10;
      const FOOD_TAX_RATE = 0.05;
      const GST_RATE = 0.18;

      const headers = [
        "Order No.",
        "Order Place Date",
        "Restaurant Name",
        "Name of Items",
        "No. of Items",
        "Price for Single Menu Items",
        "Total Menu Price",
        "Commission 10% on Menu Price",
        "Total Price with Commission",
        "Food Tax 5% (after Commission)",
        "Delivery Charges",
        "Packing Charges",
        "Discount (Offer)",
        "Total Order Value",
        "18% GST on Commission + Delivery + Packing",
      ];

      const rows = data.map((o) => {
        const ps = o.priceSummary || {};
        const items = Array.isArray(o.items) ? o.items : [];

        const itemNames = items.map((i) => i.name).join(", ") || "N/A";
        const itemCount = items.reduce((sum, i) => sum + Number(i.qty || 1), 0);
        const itemPrices = items.map((i) => `${i.name}: ₹${Number(i.price || 0).toFixed(2)}`).join(", ");

        const totalMenuPrice = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.qty || 1), 0);
        const commission = Math.round(totalMenuPrice * COMMISSION_RATE * 100) / 100;
        const totalWithCommission = Math.round((totalMenuPrice + commission) * 100) / 100;
        const foodTax = Math.round(totalWithCommission * FOOD_TAX_RATE * 100) / 100;
        const deliveryCharges = Number(o.final_delivery_charge ?? o.delivery_fee ?? 0);
        const packingCharges = Number(o.packing_charge ?? 0);
        const discount = Number(o.coupon_discount ?? o.applied_discount?.value ?? 0);
        const totalOrderValue = Number(o.price ?? o.totalAmount ?? 0);
        const gst18 = Math.round((commission + deliveryCharges + packingCharges) * GST_RATE * 100) / 100;

        return [
          o.orderId || o.id || "N/A",
          formatDateTime(o.createdAt),
          o.restaurant_name || "N/A",
          itemNames,
          itemCount,
          itemPrices,
          totalMenuPrice,
          commission,
          totalWithCommission,
          foodTax,
          deliveryCharges,
          packingCharges,
          discount,
          totalOrderValue,
          gst18,
        ];
      });

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws["!cols"] = [
        { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 40 }, { wch: 12 },
        { wch: 45 }, { wch: 18 }, { wch: 28 }, { wch: 24 }, { wch: 28 },
        { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 42 },
      ];

      // Bold header row
      const headerRange = XLSX.utils.decode_range(ws["!ref"]);
      for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellAddr]) continue;
        ws[cellAddr].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { patternType: "solid", fgColor: { rgb: "4F46E5" } },
          alignment: { horizontal: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } },
          },
        };
      }

      // Currency format for numeric columns (cols 6–14, 0-indexed)
      const currencyCols = [6, 7, 8, 9, 10, 11, 12, 13, 14];
      for (let R = 1; R <= rows.length; R++) {
        for (let C = 0; C <= headerRange.e.c; C++) {
          const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddr]) continue;
          const isCurrency = currencyCols.includes(C);
          ws[cellAddr].s = {
            numFmt: isCurrency ? '"₹"#,##0.00' : "@",
            alignment: { wrapText: true, vertical: "top" },
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } },
            },
          };
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");

      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `orders_export_${dateStr}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
      saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
      toast.success("Orders exported successfully");
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter("all"); setRestaurantFilter("all"); setCustomerFilter("all");
    setExecutiveFilter("all"); setPaymentStatusFilter("all"); setPaymentMethodFilter("all");
    setOrderTypeFilter("all"); setDateFilter("all"); setFromDate(""); setToDate("");
    setAmountMin(""); setAmountMax(""); setCityFilter("all");
    setSearchTerm(""); setDebouncedSearch(""); setCurrentPage(1); setActiveStatCard("all");
    if (searchInputRef.current) searchInputRef.current.value = "";
  };


  const hasActiveFilters = statusFilter !== "all" || restaurantFilter !== "all" || customerFilter !== "all" ||
    executiveFilter !== "all" || paymentStatusFilter !== "all" || paymentMethodFilter !== "all" ||
    orderTypeFilter !== "all" || dateFilter !== "all" || amountMin || amountMax || cityFilter !== "all" || debouncedSearch;

  const activeFilterCount = [
    statusFilter !== "all", restaurantFilter !== "all", customerFilter !== "all",
    executiveFilter !== "all", paymentStatusFilter !== "all", paymentMethodFilter !== "all",
    orderTypeFilter !== "all", dateFilter !== "all", amountMin || amountMax, cityFilter !== "all",
  ].filter(Boolean).length;

  const getLastUpdatedText = () => {
    if (lastUpdatedAgo === null) return "";
    if (lastUpdatedAgo < 3) return "Just now";
    if (lastUpdatedAgo < 60) return `${lastUpdatedAgo}s ago`;
    const mins = Math.floor(lastUpdatedAgo / 60);
    return `${mins}m ${lastUpdatedAgo % 60}s ago`;
  };

  const SortHeader = ({ column, label, className }) => {
    const isActive = sortBy === column;
    return (
      <th
        className={`px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none ${className || ""}`}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive && (
            <ArrowUpDown size={11} className={`text-indigo-500 transition-transform ${sortOrder === "ASC" ? "rotate-180" : ""}`} />
          )}
        </div>
      </th>
    );
  };

  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.totalPages || 1;
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 2) { start = 2; end = Math.min(4, totalPages - 1); }
      if (currentPage >= totalPages - 1) { start = Math.max(totalPages - 3, 2); end = totalPages - 1; }
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const statCards = [
    { key: "totalOrders", label: "Total Orders", icon: ShoppingBag, color: "bg-indigo-50 text-indigo-600" },
    { key: "activeOrders", label: "Active Orders", icon: Clock, color: "bg-blue-50 text-blue-600" },
    { key: "pendingOrders", label: "Pending Orders", icon: Radio, color: "bg-amber-50 text-amber-600" },
    { key: "deliveredOrders", label: "Delivered Orders", icon: Bike, color: "bg-emerald-50 text-emerald-600" },
    { key: "cancelledOrders", label: "Cancelled Orders", icon: Ban, color: "bg-red-50 text-red-600" },
    // { key: "revenue", label: "Revenue Generated", icon: IndianRupee, color: "bg-emerald-50 text-emerald-600" },
    // { key: "avgOrderValue", label: "Avg Order Value", icon: TrendingUp, color: "bg-violet-50 text-violet-600" },
    // { key: "refundAmount", label: "Refund Amount", icon: TrendingDown, color: "bg-rose-50 text-rose-600" },
  ];

  const statusOptions = [
    { label: "All Status", value: "all" },
    { label: "New", value: "NEW" },
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Preparing", value: "PREPARING" },
    { label: "Ready", value: "READY" },
    { label: "Picked Up", value: "PICKED_UP" },
    { label: "Delivered", value: "DELIVERED" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "Refunded", value: "REFUNDED" },
  ];

  const paymentStatusOptions = [
    { label: "All Payment Status", value: "all" },
    { label: "Paid", value: "PAID" },
    { label: "Pending", value: "PENDING" },
    { label: "Failed", value: "FAILED" },
    { label: "Refunded", value: "REFUNDED" },
  ];

  const paymentMethodOptions = [
    { label: "All Methods", value: "all" },
    { label: "UPI", value: "UPI" },
    { label: "Card", value: "CARD" },
    { label: "Cash", value: "CASH" },
  ];

  const currentStatusOptions = [
    { label: "All Status", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Assigned", value: "assigned" },
    { label: "Picked Up", value: "picked_up" },
    { label: "Out for Delivery", value: "out_for_delivery" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const dateOptions = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "last7" },
    { label: "Last 30 Days", value: "last30" },
    { label: "Custom Range", value: "custom" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50/80">
      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto px-4 py-8" onClick={() => setShowCancelModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="text-red-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Cancel Order</h3>
                    <p className="text-sm text-gray-500 mt-1">This will notify all connected parties.</p>
                  </div>
                </div>
                <button onClick={() => { setShowCancelModal(false); setSelectedOrderForCancel(null); setCancelReason(""); setOtherReason(""); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1">
                  <p className="text-sm text-gray-600">Order ID: <span className="font-semibold text-gray-900">#{selectedOrderForCancel?.orderId}</span></p>
                  <p className="text-sm text-gray-600">Customer: <span className="font-semibold text-gray-900">{selectedOrderForCancel?.customer_name || 'Guest'}</span></p>
                  <p className="text-sm text-gray-600">Amount: <span className="font-semibold text-gray-900">₹{selectedOrderForCancel?.price}</span></p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cancellation Reason <span className="text-red-500">*</span></label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white"
                  >
                    <option value="">Select a reason</option>
                    {CANCEL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {cancelReason === "other" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Specify reason</label>
                    <textarea value={otherReason} onChange={(e) => setOtherReason(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30" placeholder="Enter cancellation reason..." />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button onClick={() => { setShowCancelModal(false); setSelectedOrderForCancel(null); setCancelReason(""); setOtherReason(""); }} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50" disabled={isCancelling}>Close</button>
                <button onClick={handleCancelOrder} disabled={!cancelReason.trim() || isCancelling} className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
                  {isCancelling && <Loader2 size={14} className="animate-spin" />}
                  Confirm Cancellation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Order Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor, search, filter, and manage all platform orders</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* ── Stats Cards ── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6"
      >
        {statCards.map((stat) => (
          <StatCard
            key={stat.key}
            icon={stat.icon}
            label={stat.label}
            value={stat.key === "revenue" || stat.key === "avgOrderValue" || stat.key === "refundAmount"
              ? `₹${Number(stats[stat.key] || 0).toLocaleString("en-IN")}`
              : (stats[stat.key] || 0).toLocaleString()
            }
            color={stat.color}
            trend={statsTrend[stat.key] || undefined}
            onClick={() => handleStatCardClick(stat.key)}
            isActive={activeStatCard === stat.key}
          />
        ))}
      </motion.div>

      {/* ── Filter + Search Bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
        <div className="p-3 md:p-4 space-y-3">
          {/* Row 1: Search + Sort + Export + Reset */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                defaultValue={searchTerm}
                placeholder="Search by Order ID, Customer, Phone, Restaurant, Executive, Transaction ID..."
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-gray-50/50 hover:bg-white transition-colors placeholder:text-gray-400"
              />
            </div>

            <FilterDropdown
              label="Sort"
              icon={ArrowUpDown}
              value={sortBy + "_" + sortOrder}
              options={[
                { label: "Newest First", value: "createdAt_DESC" },
                { label: "Oldest First", value: "createdAt_ASC" },
                { label: "Amount High-Low", value: "price_DESC" },
                { label: "Amount Low-High", value: "price_ASC" },
                { label: "Order ID", value: "orderId_ASC" },
              ]}
              onChange={(v) => {
                const [col, order] = v.split("_");
                setSortBy(col);
                setSortOrder(order);
                setCurrentPage(1);
              }}
            />

            <button
              onClick={() => handleExport(false)}
              disabled={!orders.length || exportLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export
            </button>

            <button
              onClick={() => handleExport(true)}
              disabled={!pagination.total || exportLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export all filtered results"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export All</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>

          {/* Row 2: Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
              <Filter size={12} />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold ml-0.5">
                  {activeFilterCount}
                </span>
              )}
            </span>

            <FilterDropdown
              label="Status"
              icon={null}
              value={statusFilter}
              options={statusOptions}
              onChange={(v) => { console.log('Status filter changed:', v); setStatusFilter(v); setCurrentPage(1); setActiveStatCard("all"); }}
              onClear={() => { console.log('Status filter cleared'); setStatusFilter("all"); setActiveStatCard("all"); }}
            />

            <FilterDropdown
              label="Payment Status"
              icon={CreditCard}
              value={paymentStatusFilter}
              options={paymentStatusOptions}
              onChange={(v) => { setPaymentStatusFilter(v); setCurrentPage(1); }}
              onClear={() => setPaymentStatusFilter("all")}
            />

            <FilterDropdown
              label="Payment Method"
              icon={CreditCard}
              value={paymentMethodFilter}
              options={paymentMethodOptions}
              onChange={(v) => { setPaymentMethodFilter(v); setCurrentPage(1); }}
              onClear={() => setPaymentMethodFilter("all")}
            />

            <FilterDropdown
              label="Current Status"
              icon={Clock}
              value={orderTypeFilter}
              options={currentStatusOptions}
              onChange={(v) => { setOrderTypeFilter(v); setCurrentPage(1); }}
              onClear={() => setOrderTypeFilter("all")}
            />

            <FilterDropdown
              label="Date"
              icon={Calendar}
              value={dateFilter}
              options={dateOptions}
              onChange={(v) => { setDateFilter(v); setCurrentPage(1); }}
              onClear={() => { setDateFilter("all"); setFromDate(""); setToDate(""); }}
            />

            {dateFilter === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
              </div>
            )}

            {(amountMin || amountMax) && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">₹</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
                <span className="text-xs text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
              </div>
            )}

            {orders.length < pagination.total && (
              <span className="text-xs text-gray-400 ml-1">
                {orders.length} of {pagination.total} results
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Bulk Actions ── */}
      {zenzioAdmin && selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-red-600" />
            <span className="text-sm font-medium text-red-700">{selectedIds.size} order{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Selection
            </button>
            {bulkDeleteConfirm ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-medium text-red-700">Delete {selectedIds.size} order{selectedIds.size > 1 ? 's' : ''}?</span>
                <button
                  onClick={() => setBulkDeleteConfirm(false)}
                  className="px-2 py-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={isDeleting}
                >
                  No
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-2 py-1 text-[11px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                >
                  {isDeleting && <Loader2 size={10} className="animate-spin" />}
                  {isDeleting ? 'Deleting...' : 'Yes'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <EmptyState searchTerm={debouncedSearch} hasActiveFilters={hasActiveFilters} onReset={resetFilters} />
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="w-10 px-4 py-3.5 text-left">
                      <button onClick={() => {
                        if (selectedIds.size === orders.length) setSelectedIds(new Set());
                        else setSelectedIds(new Set(orders.map(o => o.orderId || o.id)));
                      }} className="text-gray-400 hover:text-gray-600 transition-colors">
                        {selectedIds.size === orders.length && orders.length > 0
                          ? <CheckSquare size={16} className="text-indigo-600" />
                          : <Square size={16} />
                        }
                      </button>
                    </th>
                    <SortHeader column="orderId" label="Order ID" />
                    <SortHeader column="customer_name" label="Customer" />
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Restaurant</th>
                    <SortHeader column="createdAt" label="Date" />
                    <SortHeader column="price" label="Amount" />
                    <SortHeader column="status" label="Status" />
                    <SortHeader column="executive" label="Executive" className="hidden xl:table-cell" />
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden 2xl:table-cell">Payment</th>
                    <th className="w-12 px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((order, idx) => {
                    const orderId = order.orderId || order.id;
                    const isHighlighted = highlightedIds.has(orderId);
                    const selected = selectedIds.has(orderId);
                    const customerInitial = (order.customer_name || order.customer || "G").charAt(0).toUpperCase();
                    return (
                      <motion.tr
                        key={orderId || idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        onClick={() => handleView(order)}
                        className={`group cursor-pointer transition-all duration-150
                          ${selected ? "bg-indigo-50/40" : "hover:bg-gray-50"}
                          ${idx % 2 === 1 && !selected ? "bg-gray-50/30" : ""}
                          ${isHighlighted ? 'animate-pulse-glow' : ''}
                        `}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => {
                            setSelectedIds(prev => {
                              const n = new Set(prev);
                              if (n.has(orderId)) n.delete(orderId); else n.add(orderId);
                              return n;
                            });
                          }} className="text-gray-300 hover:text-indigo-600 transition-colors">
                            {selected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                          </button>
                        </td>

                        {/* Order ID */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isHighlighted && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-live-pulse flex-shrink-0" />
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-xs font-mono font-semibold text-gray-800 group-hover:bg-gray-100 transition-colors">
                              #{orderId}
                            </span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {customerInitial}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px] group-hover:text-indigo-600 transition-colors">
                                {order.customer_name || order.customer || "Guest"}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{order.customer_phone || order.phone || ""}</p>
                            </div>
                          </div>
                        </td>

                        {/* Restaurant */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-gray-600 truncate max-w-[140px] block">{order.restaurant_name || "—"}</span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-800 leading-tight">
                              {new Date(order.time || order.createdAt).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                            </span>
                            <span className="text-[10px] text-gray-400 leading-tight mt-0.5">{formatDate(order.time || order.createdAt)}</span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-gray-900 tabular-nums">₹{order.price || order.totalAmount || 0}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={order.restaurantStatus || order.status} />
                        </td>

                        {/* Executive */}
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-xs text-gray-500">{order.deliveryPartnerStatus || order.executiveName || "—"}</span>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-3 hidden 2xl:table-cell">
                          <div className="flex flex-col gap-1">
                            <PaymentStatusBadge status={order.payment_status || order.paymentStatus} />
                            <span className="text-[10px] text-gray-400">{order.payment_mode || order.paymentMethod || "—"}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {zenzioAdmin ? (
                              confirmDeleteId === orderId ? (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                                  <span className="text-[11px] font-medium text-red-700">Delete?</span>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-0.5 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                    disabled={isDeleting}
                                  >
                                    No
                                  </button>
                                  <button
                                    onClick={() => handleDelete(order)}
                                    disabled={isDeleting}
                                    className="px-1.5 py-0.5 text-[11px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                                  >
                                    {isDeleting ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(orderId)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={14} className="inline mr-1" />
                                  Delete
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => handleView(order)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                View
                              </button>
                            )}
                            <ActionMenu order={order} onView={handleView} onCancel={handleOpenCancelModal} onDelete={zenzioAdmin ? (o) => setConfirmDeleteId(o.orderId || o.id) : null} />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Card View ── */}
          <div className="md:hidden space-y-3">
            {orders.map((order, idx) => (
              <MobileOrderCard
                key={order.orderId || order.id || idx}
                order={order}
                onView={handleView}
                onCancel={handleOpenCancelModal}
                onDelete={zenzioAdmin ? (o) => setConfirmDeleteId(o.orderId || o.id) : null}
                isHighlighted={highlightedIds.has(order.orderId || order.id)}
                confirmDeleteId={confirmDeleteId}
                onDeleteConfirm={handleDelete}
                isDeleting={isDeleting}
              />
            ))}
          </div>

          {/* ── Pagination ── */}
          <div className="sticky bottom-0 mt-4 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Rows per page</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-gray-400">
                {orders.length > 0
                  ? `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, pagination.total)} of ${pagination.total}`
                  : "No results"
                }
              </span>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft size={15} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>

                {getPageNumbers().map((page, idx) =>
                  page === "..." ? (
                    <span key={`e${idx}`} className="px-1.5 text-xs text-gray-300">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] h-8 text-xs font-medium rounded-lg transition-all duration-150
                        ${currentPage === page
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage >= pagination.totalPages}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  onClick={() => setCurrentPage(pagination.totalPages)}
                  disabled={currentPage === pagination.totalPages}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default OrdersList;


