import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Gift,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  Store,
  Tag,
  TimerOff,
  XCircle,
} from "lucide-react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import {
  approveOffer,
  getAllOffers,
  getAllRestaurants,
  rejectOffer,
  requestChanges,
} from "../../services/api";
import { getCurrentRestaurantUid, isRestaurantAdmin } from "../../utils/auth";

const DEFAULT_PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Rejected", value: "REJECTED" },
];

const OFFER_TYPES = [
  { label: "All Offer Types", value: "all" },
  { label: "Percentage Discount", value: "PERCENTAGE_DISCOUNT" },
  { label: "Fixed Amount Discount", value: "FIXED_AMOUNT_DISCOUNT" },
  { label: "Buy 1 Get 1 (BOGO)", value: "BUY_ONE_GET_ONE" },
  { label: "Buy X Get Y", value: "BUY_X_GET_Y" },
  { label: "Free Item On Cart Value", value: "FREE_ITEM_CART_VALUE" },
  { label: "Free Item Offer", value: "FREE_ITEM_OFFER" },
  { label: "Cart Value Offer", value: "CART_VALUE_OFFER" },
  { label: "Festival Offer", value: "FESTIVAL_OFFER" },
  { label: "Platform Campaign", value: "PLATFORM_CAMPAIGN" },
];

const CREATED_BY_OPTIONS = [
  { label: "All Creators", value: "all" },
  { label: "Restaurant Admin", value: "RESTAURANT_ADMIN" },
  { label: "Zenzio Admin", value: "ZENZIO_ADMIN" },
];

const DATE_FIELD_OPTIONS = [
  { label: "Created Date", value: "createdDate" },
  { label: "Start Date", value: "startDate" },
  { label: "End Date", value: "endDate" },
];

const DATE_RANGE_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Quarter", value: "quarter" },
  { label: "This Year", value: "year" },
];

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Highest Discount", value: "highest_discount" },
  { label: "Lowest Discount", value: "lowest_discount" },
  { label: "Most Redeemed", value: "most_redeemed" },
  { label: "Least Redeemed", value: "least_redeemed" },
  { label: "Expiring Soon", value: "expiring_soon" },
];

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const labelFor = (options, value, fallback = "-") => options.find((item) => item.value === value)?.label || fallback;

const getRestaurantName = (offer) =>
  offer.restaurant?.profile?.restaurant_name ||
  offer.restaurant?.restaurant_name ||
  offer.restaurantName ||
  (offer.restaurantId ? offer.restaurantId : "All Restaurants");

const getOfferValue = (offer) => {
  if (["BUY_ONE_GET_ONE", "BUY_X_GET_Y"].includes(offer.offerType)) return "Free item";
  if (["FREE_ITEM_CART_VALUE", "FREE_ITEM_CATEGORY", "FREE_ITEM_OFFER"].includes(offer.offerType)) return "Free item";
  if (offer.discountType === "PERCENTAGE") return `${Number(offer.discountValue || 0)}%`;
  return formatCurrency(offer.discountValue);
};

const getOfferItemNames = (offer) => {
  const names = [
    offer.discountItemNames?.buyItem,
    offer.discountItemNames?.freeItem,
    ...(offer.discountItemNames?.applicableItems || []),
    ...(offer.applicableItemNames || []),
  ].filter(Boolean);

  return [...new Set(names)];
};

const getOfferItemSummary = (offer) => {
  const names = getOfferItemNames(offer);
  if (!names.length) return "-";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
};

const StatusPill = ({ status }) => {
  const styles = {
    ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-100",
    INACTIVE: "bg-slate-50 text-slate-600 border-slate-200",
    SCHEDULED: "bg-indigo-50 text-indigo-600 border-indigo-100",
    EXPIRED: "bg-orange-50 text-orange-600 border-orange-100",
    PENDING_APPROVAL: "bg-amber-50 text-amber-600 border-amber-100",
    REJECTED: "bg-red-50 text-red-600 border-red-100",
    CHANGES_REQUESTED: "bg-blue-50 text-blue-600 border-blue-100",
  };

  const label = {
    PENDING_APPROVAL: "Pending Approval",
    CHANGES_REQUESTED: "Changes Requested",
  }[status] || String(status || "-").replaceAll("_", " ");

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md transition-shadow duration-200"
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const FilterDropdown = ({ label, icon: Icon, value, options, onChange, onClear }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = value && value !== "all";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 ${
          active
            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        {Icon && <Icon size={14} />}
        {active ? labelFor(options, value, label) : label}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 z-50 py-1 overflow-hidden max-h-72 overflow-y-auto"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                  value === opt.value ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {onClear && active && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setOpen(false);
                  }}
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

const ExportMenu = ({ disabled, onExport }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 z-50 py-1 overflow-hidden"
          >
            <button type="button" onClick={() => { setOpen(false); onExport("csv"); }} className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <Download size={14} />
              CSV
            </button>
            <button type="button" onClick={() => { setOpen(false); onExport("excel"); }} className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <FileSpreadsheet size={14} />
              Excel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ActionMenu = ({ offer, onView, onApprove, onReject, onChanges, restaurantAdmin }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canApprove = !restaurantAdmin && ["PENDING_APPROVAL", "CHANGES_REQUESTED"].includes(offer.lifecycleStatus);
  const items = [
    { label: "View Details", icon: Tag, action: () => onView(offer) },
    canApprove && { label: "Approve", icon: CheckCircle2, action: () => onApprove(offer) },
    canApprove && { label: "Request Changes", icon: Clock, action: () => onChanges(offer) },
    canApprove && { label: "Reject", icon: XCircle, action: () => onReject(offer), danger: true },
  ].filter(Boolean);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((next) => !next);
        }}
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
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  item.action();
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${
                  item.danger ? "text-red-500 hover:bg-red-50" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="w-10 h-10 rounded-lg bg-gray-100 animate-skeleton mb-3" />
          <div className="h-3 w-20 bg-gray-100 rounded animate-skeleton mb-2" />
          <div className="h-6 w-14 bg-gray-100 rounded animate-skeleton" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
          <div className="w-9 h-9 rounded-lg bg-gray-100 animate-skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-gray-100 rounded animate-skeleton" />
            <div className="h-3 w-32 bg-gray-100 rounded animate-skeleton" />
          </div>
          <div className="h-5 w-24 bg-gray-100 rounded-full animate-skeleton" />
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ onReset, searchTerm }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center"
  >
    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
      <Gift size={32} className="text-gray-300" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-1">
      {searchTerm ? "No offers found" : "No offers yet"}
    </h3>
    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
      {searchTerm ? "Try adjusting your search or filters." : "Offers will appear here after they are created."}
    </p>
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200"
    >
      <RefreshCw size={15} />
      Reset Filters
    </button>
  </motion.div>
);

const OffersList = () => {
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();
  const ownRestaurantUid = getCurrentRestaurantUid();
  const searchInputRef = useRef(null);

  const [offers, setOffers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    expired: 0,
    pending: 0,
    avgRedemptionRate: 0,
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [offerType, setOfferType] = useState("all");
  const [restaurantFilter, setRestaurantFilter] = useState(restaurantAdmin && ownRestaurantUid ? ownRestaurantUid : "all");
  const [dateField, setDateField] = useState("createdDate");
  const [dateRange, setDateRange] = useState("all");
  const [createdByRole, setCreatedByRole] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const restaurantOptions = useMemo(() => {
    const options = [{ label: "All Restaurants", value: "all" }];
    restaurants.forEach((restaurant) => {
      const value = restaurant.uid || restaurant.id;
      if (!value) return;
      options.push({
        value,
        label: restaurant.profile?.restaurant_name || restaurant.restaurant_name || restaurant.name || value,
      });
    });
    return options;
  }, [restaurants]);

  const buildParams = useCallback((overrides = {}) => ({
    page: currentPage,
    pageSize: itemsPerPage,
    search: debouncedSearch,
    status: statusFilter,
    offerType,
    restaurantId: restaurantAdmin && ownRestaurantUid ? ownRestaurantUid : restaurantFilter,
    dateField,
    dateRange,
    createdByRole,
    sortBy,
    ...overrides,
  }), [
    currentPage,
    itemsPerPage,
    debouncedSearch,
    statusFilter,
    offerType,
    restaurantFilter,
    dateField,
    dateRange,
    createdByRole,
    sortBy,
    restaurantAdmin,
    ownRestaurantUid,
  ]);

  const fetchRestaurants = useCallback(async () => {
    if (restaurantAdmin) return;
    try {
      const response = await getAllRestaurants({});
      const data =
        response.data?.data?.restaurants ||
        response.data?.restaurants ||
        response.data?.data ||
        response.data ||
        [];
      setRestaurants(Array.isArray(data) ? data : []);
    } catch {
      setRestaurants([]);
    }
  }, [restaurantAdmin]);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllOffers(buildParams());
      const payload = response.data || {};
      const data = Array.isArray(payload.data) ? payload.data : [];
      setOffers(data);
      setTotalCount(Number(payload.count || data.length || 0));
      if (payload.stats) setStats(payload.stats);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error(error.response?.data?.message || "Failed to load offers");
      setOffers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== "all" ||
    offerType !== "all" ||
    (!restaurantAdmin && restaurantFilter !== "all") ||
    dateRange !== "all" ||
    createdByRole !== "all" ||
    sortBy !== "newest";

  const resetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setOfferType("all");
    setRestaurantFilter(restaurantAdmin && ownRestaurantUid ? ownRestaurantUid : "all");
    setDateField("createdDate");
    setDateRange("all");
    setCreatedByRole("all");
    setSortBy("newest");
    setCurrentPage(1);
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  const handleView = (offer) => navigate(`/offers/${offer.id}`);

  const runAction = async (label, callback) => {
    try {
      setActionLoading(true);
      await callback();
      toast.success(label);
      fetchOffers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Offer action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = (offer) => runAction("Offer approved", () => approveOffer(offer.id));

  const handleReject = (offer) => {
    const reason = window.prompt("Enter reason for rejection:");
    if (!reason?.trim()) return;
    runAction("Offer rejected", () => rejectOffer(offer.id, reason));
  };

  const handleRequestChanges = (offer) => {
    const comments = window.prompt("What changes should the restaurant make?");
    if (!comments?.trim()) return;
    runAction("Changes requested", () => requestChanges(offer.id, comments));
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }

    pages.push(1);
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    if (currentPage <= 2) {
      start = 2;
      end = Math.min(4, totalPages - 1);
    }
    if (currentPage >= totalPages - 1) {
      start = Math.max(totalPages - 3, 2);
      end = totalPages - 1;
    }
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i += 1) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === offers.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(offers.map((offer) => offer.id)));
  };

  const getExportRows = async () => {
    const pageSize = 500;
    let page = 1;
    let rows = [];
    let count = 0;
    do {
      const response = await getAllOffers(buildParams({ page, pageSize }));
      const payload = response.data || {};
      const data = Array.isArray(payload.data) ? payload.data : [];
      rows = rows.concat(data);
      count = Number(payload.count || rows.length);
      page += 1;
    } while (rows.length < count && page < 20);
    return rows;
  };

  const serializeRows = (rows) => [
    ["Offer Name", "Offer Code", "Restaurant", "Offer Type", "Discount", "Offer Items", "Status", "Created By", "Start Date", "End Date", "Redemptions", "Revenue"],
    ...rows.map((offer) => [
      offer.title || "-",
      offer.offerCode || "-",
      getRestaurantName(offer),
      labelFor(OFFER_TYPES, offer.offerType, offer.offerType || offer.discountType),
      getOfferValue(offer),
      getOfferItemNames(offer).join(", ") || "-",
      offer.lifecycleStatus || offer.status,
      offer.createdByAdmin ? "Zenzio Admin" : "Restaurant Admin",
      formatDate(offer.startDate),
      formatDate(offer.endDate),
      offer.totalUses || offer.redemptionCount || 0,
      offer.totalRevenueGenerated || offer.revenueGenerated || 0,
    ]),
  ];

  const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

  const handleExport = async (format) => {
    try {
      const rows = await getExportRows();
      if (!rows.length) {
        toast.error("No offers to export");
        return;
      }
      const table = serializeRows(rows);
      const date = new Date().toISOString().split("T")[0];
      if (format === "excel") {
        const html = `<table>${table.map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? "")}</td>`).join("")}</tr>`).join("")}</table>`;
        saveAs(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }), `offers-${date}.xls`);
      } else {
        const csv = table.map((row) => row.map(escapeCsv).join(",")).join("\n");
        saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `offers-${date}.csv`);
      }
      toast.success(`Exported ${rows.length} offer(s)`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Export failed");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50/80">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Offer Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage offer lifecycle, approvals, campaigns, and redemption performance</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/offers/create")}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200"
        >
          <Plus size={16} />
          Create Offer
        </button>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6"
      >
        <StatCard icon={Tag} label="Total Offers" value={stats.total || 0} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={CheckCircle2} label="Active Offers" value={stats.active || 0} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Clock} label="Scheduled Offers" value={stats.scheduled || 0} color="bg-blue-50 text-blue-600" />
        <StatCard icon={TimerOff} label="Expired Offers" value={stats.expired || 0} color="bg-orange-50 text-orange-600" />
        <StatCard icon={XCircle} label="Pending Approval" value={stats.pending || 0} color="bg-amber-50 text-amber-600" />
        <StatCard icon={Gift} label="Avg Redemption" value={`${Number(stats.avgRedemptionRate || 0).toFixed(1)}%`} color="bg-pink-50 text-pink-600" />
      </motion.div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
        <div className="p-3 md:p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-xl">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                defaultValue={searchTerm}
                placeholder="Search by offer, code, restaurant, type, creator, status..."
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-gray-50/50 hover:bg-white transition-colors placeholder:text-gray-400"
              />
            </div>

            <FilterDropdown
              label="Sort"
              icon={ArrowUpDown}
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={(value) => { setSortBy(value); setCurrentPage(1); }}
            />

            <ExportMenu disabled={totalCount === 0} onExport={handleExport} />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
              <Filter size={12} />
              Filters
            </span>

            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
              onClear={() => setStatusFilter("all")}
            />
            <FilterDropdown
              label="Offer Type"
              icon={Gift}
              value={offerType}
              options={OFFER_TYPES}
              onChange={(value) => { setOfferType(value); setCurrentPage(1); }}
              onClear={() => setOfferType("all")}
            />
            {!restaurantAdmin && (
              <FilterDropdown
                label="Restaurant"
                icon={Store}
                value={restaurantFilter}
                options={restaurantOptions}
                onChange={(value) => { setRestaurantFilter(value); setCurrentPage(1); }}
                onClear={() => setRestaurantFilter("all")}
              />
            )}
            <FilterDropdown
              label="Date Field"
              icon={Calendar}
              value={dateField}
              options={DATE_FIELD_OPTIONS}
              onChange={(value) => { setDateField(value); setCurrentPage(1); }}
            />
            <FilterDropdown
              label="Date"
              icon={Calendar}
              value={dateRange}
              options={DATE_RANGE_OPTIONS}
              onChange={(value) => { setDateRange(value); setCurrentPage(1); }}
              onClear={() => setDateRange("all")}
            />
            <FilterDropdown
              label="Created By"
              value={createdByRole}
              options={CREATED_BY_OPTIONS}
              onChange={(value) => { setCreatedByRole(value); setCurrentPage(1); }}
              onClear={() => setCreatedByRole("all")}
            />
            <span className="text-xs text-gray-400 ml-1">{totalCount} result{totalCount === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium">
              <CheckSquare size={16} />
              {selectedIds.size} selected
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <LoadingSkeleton />
      ) : offers.length === 0 ? (
        <EmptyState searchTerm={debouncedSearch} onReset={resetFilters} />
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="w-10 px-4 py-3.5 text-left">
                      <button type="button" onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                        {selectedIds.size === offers.length && offers.length > 0 ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Offer</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restaurant</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usage</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Validity</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="w-12 px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {offers.map((offer, index) => {
                    const selected = selectedIds.has(offer.id);
                    return (
                      <motion.tr
                        key={offer.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02, duration: 0.2 }}
                        onClick={() => handleView(offer)}
                        className={`group cursor-pointer transition-all duration-150 ${selected ? "bg-indigo-50/40" : "hover:bg-gray-50"} ${index % 2 === 1 && !selected ? "bg-gray-50/30" : ""}`}
                      >
                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                          <button type="button" onClick={() => toggleSelect(offer.id)} className="text-gray-300 hover:text-indigo-600 transition-colors">
                            {selected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                              {(offer.offerCode || offer.title || "?").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px] group-hover:text-indigo-600 transition-colors">{offer.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{offer.offerCode || "No code"} · {offer.createdByAdmin ? "Zenzio Admin" : "Restaurant Admin"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600 truncate max-w-[160px]">{getRestaurantName(offer)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                            {labelFor(OFFER_TYPES, offer.offerType, offer.offerType || offer.discountType)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-gray-900">{getOfferValue(offer)}</p>
                          <p className="text-xs text-gray-400">Min {formatCurrency(offer.minOrderValue)}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[180px]" title={getOfferItemNames(offer).join(", ")}>
                            Items: {getOfferItemSummary(offer)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-700">{offer.totalUses || offer.redemptionCount || 0} uses</p>
                          <p className="text-xs text-gray-400">{formatCurrency(offer.totalRevenueGenerated || offer.revenueGenerated)} revenue</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{formatDate(offer.startDate)}</p>
                          <p className="text-xs text-gray-400">to {formatDate(offer.endDate)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={offer.lifecycleStatus} />
                        </td>
                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button type="button" onClick={() => handleView(offer)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              View
                            </button>
                            <ActionMenu
                              offer={offer}
                              onView={handleView}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              onChanges={handleRequestChanges}
                              restaurantAdmin={restaurantAdmin}
                            />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {offers.map((offer) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleView(offer)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{offer.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{offer.offerCode || "No code"} · {getRestaurantName(offer)}</p>
                  </div>
                  <StatusPill status={offer.lifecycleStatus} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Type</p>
                    <p className="font-medium text-gray-700">{labelFor(OFFER_TYPES, offer.offerType, offer.discountType)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Discount</p>
                    <p className="font-medium text-gray-700">{getOfferValue(offer)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Items: {getOfferItemSummary(offer)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Uses</p>
                    <p className="font-medium text-gray-700">{offer.totalUses || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Valid Until</p>
                    <p className="font-medium text-gray-700">{formatDate(offer.endDate)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="sticky bottom-0 mt-4 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Rows per page</span>
              <select
                value={itemsPerPage}
                onChange={(event) => {
                  setItemsPerPage(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
              >
                {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <span className="text-gray-400">{startIndex}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}</span>
              {actionLoading && <Loader2 size={13} className="animate-spin text-indigo-500" />}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronsLeft size={15} />
                </button>
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={15} />
                </button>
                {getPageNumbers().map((page, index) => page === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-gray-300">...</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 text-xs font-medium rounded-lg transition-all duration-150 ${currentPage === page ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
                  >
                    {page}
                  </button>
                ))}
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={15} />
                </button>
                <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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

export default OffersList;
