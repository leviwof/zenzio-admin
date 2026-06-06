import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Download, Edit3, MoreVertical, Trash2,
  Store, Star, MapPin, Calendar, RotateCcw,
  CheckSquare, Square, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, ArrowUpDown, Clock, Power, UserCheck, BadgeCheck,
  Loader2, UtensilsCrossed, RefreshCw, ChevronDown,
} from "lucide-react";
import {
  getAllRestaurants, getRestaurantById, toggleRestaurantActive,
  updateRestaurantStatus, permanentlyDeleteRestaurant
} from "../../services/api";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { getCurrentRestaurantUid, isRestaurantAdmin } from "../../utils/auth";
import Card, { CardContent, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  isRestaurantCurrentlyServiceable,
  isRestaurantNoHoursConfigured,
  isRestaurantOnline,
  isRestaurantOutsideOperationalHours,
  normalizeRestaurantAvailability,
} from "../../utils/restaurantAvailability";

const MIN_RATING_THRESHOLD = 50;
const DEFAULT_RATING = 4.0;

const getRestaurantDisplayRating = (restaurant) => {
  const ratingCount = Number(restaurant?.rating_count || 0);
  const ratingAvg = Number(restaurant?.rating_avg || 0);
  if (ratingAvg > 0) return ratingAvg;
  if (restaurant?.displayRating !== undefined && restaurant?.displayRating !== null) {
    return Number(restaurant.displayRating);
  }
  return ratingCount >= MIN_RATING_THRESHOLD ? ratingAvg : DEFAULT_RATING;
};

const getRestaurantRatingCount = (restaurant) => Number(restaurant?.rating_count || 0);

const isRestaurantBlocked = (restaurant = {}) =>
  restaurant.isActive === false || restaurant.accountIsActive === false;

const isRestaurantWorking = (restaurant = {}) =>
  !isRestaurantBlocked(restaurant) && isRestaurantCurrentlyServiceable(restaurant);

const isRestaurantNotWorking = (restaurant = {}) =>
  !isRestaurantBlocked(restaurant) && !isRestaurantCurrentlyServiceable(restaurant);

// ─── Helpers ──────────────────────────────────────────
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const getTimeAgo = (d) => {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const RatingStars = ({ rating }) => {
  if (!rating || rating === 0) return <span className="text-xs text-gray-400">—</span>;
  const full = Math.floor(rating);
  const starClass = "text-amber-400";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= full ? starClass : "text-gray-200"} fill={i <= full ? "currentColor" : "none"} />
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-700">{Number(rating).toFixed(1)}</span>
    </div>
  );
};

const StatusPill = ({ restaurant }) => {
  const operational = isRestaurantCurrentlyServiceable(restaurant);
  if (operational) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Operational
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Non-operational
    </span>
  );
};

const VerificationBadge = ({ verified }) =>
  verified ? <BadgeCheck size={14} className="text-blue-500 shrink-0" /> : null;

const OpenCloseButton = ({ restaurant, onClick, loading, compact = false }) => {
  const online = isRestaurantOnline(restaurant);
  const disabled = loading || restaurant.isActive === false;
  const label = online ? "Close" : "Open";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(restaurant.uid);
      }}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
        compact ? "px-2.5 py-1.5" : "px-3 py-2"
      } ${
        online
          ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
      title={restaurant.isActive === false ? "Blocked restaurants must be unblocked first" : `${label} restaurant`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
      {label}
    </button>
  );
};

// ─── Filter Dropdown ──────────────────────────────────
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

// ─── Action Menu ─────────────────────────────────────
const ActionMenu = ({ restaurant, onView, onEdit, onDelete, onBlock, canModerate }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = [
    { label: "View Restaurant", icon: Store, action: () => onView(restaurant) },
    { label: "Edit", icon: Edit3, action: () => onEdit?.(restaurant) },
    ...(canModerate
      ? [
          {
            label: restaurant.isActive === false ? "Unblock" : "Block",
            icon: Power,
            action: () => onBlock(restaurant),
            danger: restaurant.isActive !== false,
          },
          { label: "Delete", icon: Trash2, action: () => onDelete(restaurant), danger: true },
        ]
      : []),
  ];

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
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setOpen(false); item.action(); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors
                  ${item.danger ? "text-red-500 hover:bg-red-50" : "text-gray-600 hover:bg-gray-50"}`}
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

// ─── Delete Modal ────────────────────────────────────
const DeleteModal = ({ open, restaurant, onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Restaurant</h3>
        <p className="text-sm text-gray-500 text-center mb-1">
          Are you sure you want to permanently delete
        </p>
        <p className="text-sm font-semibold text-gray-700 text-center mb-4">
          &ldquo;{restaurant?.restaurant_name}&rdquo;?
        </p>
        <p className="text-xs text-red-500 text-center mb-6 bg-red-50 rounded-lg p-2.5">
          This action cannot be undone. Their Firebase account will also be deleted.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, sub, trend }) => (
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
      {(sub || trend) && (
        <p className="text-[11px] text-gray-400 mt-0.5">{trend ? `${trend} vs last month` : sub}</p>
      )}
    </div>
  </motion.div>
);

// ─── Mobile Restaurant Card ──────────────────────────
const MobileRestaurantCard = ({ restaurant, details, detailsLoading, selected, onSelect, onView, onToggle, toggleLoading, onDelete, onBlock, canModerate }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3"
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {restaurant.restaurant_name?.charAt(0) || "?"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
            {restaurant.restaurant_name}
            <VerificationBadge verified={restaurant.verified} />
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusPill restaurant={restaurant} />
            <span className="text-[11px] text-gray-400">{restaurant.city || details?.[restaurant.uid]?.city || "—"}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {canModerate && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(restaurant.uid); }}
            className={`p-1 rounded transition-colors ${selected ? "text-indigo-600" : "text-gray-300 hover:text-gray-400"}`}
          >
            {selected ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
        )}
        <ActionMenu restaurant={restaurant} onView={onView} onDelete={onDelete} onBlock={onBlock} canModerate={canModerate} />
      </div>
    </div>
    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
      <div className="flex items-center gap-2">
        <RatingStars rating={details?.[restaurant.uid]?.rating} />
      </div>
      <div className="flex items-center gap-2">
        <span>{formatDate(restaurant.createdAt)}</span>
        <OpenCloseButton
          restaurant={restaurant}
          onClick={onToggle}
          loading={toggleLoading[restaurant.uid]}
          compact
        />
      </div>
    </div>
  </motion.div>
);

// ─── Main Component ──────────────────────────────────
const RestaurantsList = () => {
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();
  const ownRestaurantUid = getCurrentRestaurantUid();
  const searchInputRef = useRef(null);

  // ── State ──
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [toggleLoading, setToggleLoading] = useState({});
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState({});
  const [restaurantDetails, setRestaurantDetails] = useState({});

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Debounced Search ──
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Fetch Restaurants ──
  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllRestaurants({});
      let basicData = [];
      if (Array.isArray(response.data)) basicData = response.data;
      else if (response.data?.data) basicData = response.data.data;
      const processed = basicData.map((r) => {
        const availability = normalizeRestaurantAvailability(r);
        return {
          ...availability,
          id: r.id,
          uid: r.uid || `NO_UID_${r.id}`,
          createdAt: r.createdAt,
          restaurant_name: r.profile?.restaurant_name || r.restaurant_name || "-",
          verified: r.verified || r.profile?.verified || false,
          city: "-",
          email: "-",
          phone: "-",
          rating: getRestaurantDisplayRating(r),
          ratingCount: getRestaurantRatingCount(r),
        };
      });
      setRestaurants(processed);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  // ── Load Contact Details ──
  const currentRestaurantsRef = useRef([]);

  useEffect(() => {
    const visible = currentRestaurantsRef.current.filter(
      (r) => !restaurantDetails[r.uid] && !detailsLoading[r.uid] && r.uid && !r.uid.startsWith("NO_UID")
    );
    if (visible.length === 0) return;
    (async () => {
      for (const restaurant of visible) {
        setDetailsLoading((prev) => ({ ...prev, [restaurant.uid]: true }));
        try {
          const resp = await getRestaurantById(restaurant.uid);
          const d = normalizeRestaurantAvailability(resp.data?.data?.restaurant || resp.data?.restaurant || resp.data?.data || {});
          let email = "-", phone = "-", city = "-";
          if (d?.profile?.contact_email) email = d.profile.contact_email;
          else if (d?.contact?.encryptedEmail) email = d.contact.encryptedEmail;
          else if (d?.contact?.email) email = d.contact.email;
          if (d?.profile?.contact_number) phone = d.profile.contact_number;
          else if (d?.contact?.encryptedPhone) phone = d.contact.encryptedPhone;
          else if (d?.contact?.phone) phone = d.contact.phone;
          if (d?.address?.city) city = d.address.city;
          const ratingCount = getRestaurantRatingCount(d);
          const displayRating = getRestaurantDisplayRating(d);
          setRestaurantDetails((prev) => ({
            ...prev,
            [restaurant.uid]: { email, phone, city, rating: displayRating, ratingCount, cuisines: d?.cuisines || [] },
          }));
          setRestaurants((prev) => prev.map((item) => (
            item.uid === restaurant.uid
              ? {
                  ...item,
                  isActive: d.isActive,
                  accountIsActive: d.accountIsActive,
                  isOnline: d.isOnline,
                  restaurantOnline: d.restaurantOnline,
                  isManuallyOff: d.isManuallyOff,
                  isOpen: d.isOpen,
                  canAcceptOrders: d.canAcceptOrders,
                  isAvailable: d.isAvailable,
                  statusLabel: d.statusLabel,
                  availability: d.availability,
                }
              : item
          )));
        } catch {
          setRestaurantDetails((prev) => ({
            ...prev,
            [restaurant.uid]: { email: "-", phone: "-", city: "-", rating: DEFAULT_RATING, ratingCount: 0, cuisines: [] },
          }));
        } finally {
          setDetailsLoading((prev) => ({ ...prev, [restaurant.uid]: false }));
        }
      }
    })();
  }, [currentPage, restaurants]);

  // ── Filtering & Sorting ──
  const cities = useMemo(() => {
    const set = new Set();
    restaurants.forEach((r) => {
      const c = restaurantDetails[r.uid]?.city;
      if (c && c !== "-") set.add(c);
    });
    return Array.from(set).sort();
  }, [restaurants, restaurantDetails]);

  const getFilteredAndSorted = useCallback(() => {
    let filtered = [...restaurants];

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((r) => isRestaurantWorking(r));
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((r) => isRestaurantNotWorking(r));
    } else if (statusFilter === "pending") {
      filtered = filtered.filter((r) => r.statusLabel === "pending");
    }

    // City filter
    if (cityFilter !== "all") {
      filtered = filtered.filter((r) => restaurantDetails[r.uid]?.city === cityFilter);
    }

    // Rating filter
    if (ratingFilter !== "all") {
      const minRating = parseInt(ratingFilter);
      filtered = filtered.filter((r) => (restaurantDetails[r.uid]?.rating || 0) >= minRating);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = Date.now();
      const ranges = {
        week: 7 * 86400000,
        month: 30 * 86400000,
        year: 365 * 86400000,
      };
      const cutoff = now - (ranges[dateFilter] || 0);
      filtered = filtered.filter((r) => r.createdAt && new Date(r.createdAt).getTime() >= cutoff);
    }

    // Search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.restaurant_name?.toLowerCase().includes(q) ||
          restaurantDetails[r.uid]?.city?.toLowerCase().includes(q) ||
          restaurantDetails[r.uid]?.email?.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.restaurant_name?.localeCompare(b.restaurant_name);
        case "date":
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        case "rating":
          return (restaurantDetails[b.uid]?.rating || 0) - (restaurantDetails[a.uid]?.rating || 0);
        case "status": {
          const aActive = isRestaurantWorking(a);
          const bActive = isRestaurantWorking(b);
          return (aActive === bActive ? 0 : aActive ? -1 : 1);
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [restaurants, statusFilter, cityFilter, ratingFilter, dateFilter, debouncedSearch, sortBy, restaurantDetails]);

  const filtered = useMemo(() => getFilteredAndSorted(), [getFilteredAndSorted]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRestaurants = filtered.slice(startIndex, startIndex + itemsPerPage);
  currentRestaurantsRef.current = currentRestaurants;

  // Stats
  const stats = useMemo(() => {
    const total = restaurants.length;
    const active = restaurants.filter((r) => isRestaurantWorking(r)).length;
    const inactive = restaurants.filter((r) => isRestaurantNotWorking(r)).length;
    const pending = restaurants.filter((r) => r.statusLabel === "pending").length;
    const qualified = Object.values(restaurantDetails).filter((d) => (d.ratingCount || 0) >= MIN_RATING_THRESHOLD);
    const avgRating = qualified.length ? (qualified.reduce((a, b) => a + b.rating, 0) / qualified.length) : 0;
    return { total, active, inactive, pending, avgRating };
  }, [restaurants, restaurantDetails]);

  // ── Actions ──
  const handleToggle = async (uid) => {
    setToggleLoading((prev) => ({ ...prev, [uid]: true }));
    try {
      const r = restaurants.find((x) => x.uid === uid);
      if (r?.isActive === false) {
        toast.error("Blocked restaurants must be unblocked by a Zenzio admin before opening");
        return;
      }
      const nextOpen = !isRestaurantOnline(r);
      const response = await toggleRestaurantActive(uid);
      const responseData = response.data?.data || response.data?.restaurant || response.data;
      if (responseData) {
        setRestaurants((prev) => prev.map((item) => (
          item.uid === uid ? normalizeRestaurantAvailability({ ...item, ...responseData }) : item
        )));
      }
      toast.success(nextOpen ? "Restaurant opened" : "Restaurant closed");
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update restaurant");
    } finally {
      setToggleLoading((prev) => ({ ...prev, [uid]: false }));
    }
  };

  const handleBlock = async (restaurant) => {
    if (restaurantAdmin) {
      toast.error("Restaurant admins can only open or close their restaurant");
      return;
    }
    setToggleLoading((prev) => ({ ...prev, [restaurant.uid]: true }));
    try {
      const nextStatus = restaurant.isActive === false;
      await updateRestaurantStatus(restaurant.uid, nextStatus);
      toast.success(nextStatus ? "Restaurant unblocked" : "Restaurant blocked");
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update restaurant");
    } finally {
      setToggleLoading((prev) => ({ ...prev, [restaurant.uid]: false }));
    }
  };

  const handleView = (restaurant) => {
    if (!restaurant.uid || restaurant.uid === "undefined") {
      toast.error("Invalid restaurant UID");
      return;
    }
    navigate(`/restaurants/${restaurant.uid}`);
  };

  const handleDeleteClick = (restaurant) => setDeleteTarget(restaurant);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await permanentlyDeleteRestaurant(deleteTarget.uid);
      toast.success("Restaurant deleted successfully");
      setDeleteTarget(null);
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete restaurant");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = () => {
    if (!filtered.length) { toast.error("No data to export"); return; }
    const csv = [
      ["Restaurant Name", "Email", "Phone", "City", "Registration Date", "Rating", "Status"],
      ...filtered.map((r) => [
        r.restaurant_name || "-",
        restaurantDetails[r.uid]?.email || "-",
        restaurantDetails[r.uid]?.phone || "-",
        restaurantDetails[r.uid]?.city || "-",
        formatDate(r.createdAt),
        restaurantDetails[r.uid]?.rating || "0",
        r.isActive ? "Active" : "Inactive",
      ]),
    ]
      .map((e) => e.join(","))
      .join("\n");
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `restaurants-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleBulkAction = async (action) => {
    if (restaurantAdmin) {
      toast.error("Restaurant admins can only open or close their restaurant");
      return;
    }
    if (selectedIds.size === 0) { toast.error("No restaurants selected"); return; }
    const ids = Array.from(selectedIds);
    if (action === "activate") {
      for (const uid of ids) {
        try { await updateRestaurantStatus(uid, true); } catch { /* skip */ }
      }
      toast.success(`${ids.length} restaurant(s) unblocked`);
    } else if (action === "deactivate") {
      for (const uid of ids) {
        try { await updateRestaurantStatus(uid, false); } catch { /* skip */ }
      }
      toast.success(`${ids.length} restaurant(s) blocked`);
    } else if (action === "delete") {
      if (!window.confirm(`Delete ${ids.length} restaurant(s) permanently?`)) return;
      for (const uid of ids) {
        try { await permanentlyDeleteRestaurant(uid); } catch { /* skip */ }
      }
      toast.success(`${ids.length} restaurant(s) deleted`);
    }
    setSelectedIds(new Set());
    fetchRestaurants();
  };

  const toggleSelect = (uid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentRestaurants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentRestaurants.map((r) => r.uid)));
    }
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setCityFilter("all");
    setRatingFilter("all");
    setDateFilter("all");
    setSearchTerm("");
    setDebouncedSearch("");
    setCurrentPage(1);
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  const hasActiveFilters = statusFilter !== "all" || cityFilter !== "all" || ratingFilter !== "all" || dateFilter !== "all" || debouncedSearch;

  // ── Redirect for Restaurant Admins ──
  if (restaurantAdmin) {
    if (ownRestaurantUid) return <Navigate to={`/restaurants/${ownRestaurantUid}`} replace />;
    return (
      <div className="p-6">
        <div className="bg-white border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">
          Restaurant access is not linked to your account yet. Please contact Zenzio support.
        </div>
      </div>
    );
  }

  // ── Page Numbers ──
  const getPageNumbers = () => {
    const pages = [];
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

  // ── Render ──
  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50/80">
      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            open
            restaurant={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Restaurant Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage onboarding, availability, and restaurant operations</p>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6"
      >
        <StatCard icon={Store} label="Total Restaurants" value={stats.total} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={UserCheck} label="Active" value={stats.active} color="bg-emerald-50 text-emerald-600" sub={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% of total`} />
        <StatCard icon={Power} label="Inactive" value={stats.inactive} color="bg-red-50 text-red-600" />
        <StatCard icon={Clock} label="Pending Approval" value={stats.pending} color="bg-amber-50 text-amber-600" />
        <StatCard icon={Star} label="Avg Rating" value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"} color="bg-amber-50 text-amber-600" sub={stats.avgRating ? `${Object.values(restaurantDetails).filter(d => (d.ratingCount || 0) >= MIN_RATING_THRESHOLD).length} qualified` : ""} />
      </motion.div>

      {/* ── Filter + Search Bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
        <div className="p-3 md:p-4 space-y-3">
          {/* Row 1: Search + Sort + Export + Reset */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                defaultValue={searchTerm}
                placeholder="Search by name, city, email..."
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-gray-50/50 hover:bg-white transition-colors placeholder:text-gray-400"
              />
            </div>

            {/* Sort */}
            <FilterDropdown
              label="Sort"
              icon={ArrowUpDown}
              value={sortBy}
              options={[
                { label: "Name (A-Z)", value: "name" },
                { label: "Newest First", value: "date" },
                { label: "Highest Rated", value: "rating" },
                { label: "Active First", value: "status" },
              ]}
              onChange={(v) => { setSortBy(v); setCurrentPage(1); }}
            />

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              Export
            </button>

            {/* Reset */}
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
            </span>

            <FilterDropdown
              label="Status"
              icon={null}
              value={statusFilter}
              options={[
                { label: "All", value: "all" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Pending", value: "pending" },
              ]}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
              onClear={() => setStatusFilter("all")}
            />

            <FilterDropdown
              label="City"
              icon={MapPin}
              value={cityFilter}
              options={[{ label: "All Cities", value: "all" }, ...cities.map((c) => ({ label: c, value: c }))]}
              onChange={(v) => { setCityFilter(v); setCurrentPage(1); }}
              onClear={() => setCityFilter("all")}
            />

            <FilterDropdown
              label="Rating"
              icon={Star}
              value={ratingFilter}
              options={[
                { label: "All Ratings", value: "all" },
                { label: "4+ Stars", value: "4" },
                { label: "3+ Stars", value: "3" },
                { label: "2+ Stars", value: "2" },
                { label: "1+ Stars", value: "1" },
              ]}
              onChange={(v) => { setRatingFilter(v); setCurrentPage(1); }}
              onClear={() => setRatingFilter("all")}
            />

            <FilterDropdown
              label="Registered"
              icon={Calendar}
              value={dateFilter}
              options={[
                { label: "All Time", value: "all" },
                { label: "This Week", value: "week" },
                { label: "This Month", value: "month" },
                { label: "This Year", value: "year" },
              ]}
              onChange={(v) => { setDateFilter(v); setCurrentPage(1); }}
              onClear={() => setDateFilter("all")}
            />

            {filtered.length < restaurants.length && (
              <span className="text-xs text-gray-400 ml-1">
                {filtered.length} of {restaurants.length} results
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && !restaurantAdmin && (
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction("activate")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Unblock All
              </button>
              <button
                onClick={() => handleBulkAction("deactivate")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Block All
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete All
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : currentRestaurants.length === 0 ? (
        <EmptyState searchTerm={debouncedSearch} onReset={resetFilters} />
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {!restaurantAdmin && (
                      <th className="w-10 px-4 py-3.5 text-left">
                        <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                          {selectedIds.size === currentRestaurants.length && currentRestaurants.length > 0
                            ? <CheckSquare size={16} className="text-indigo-600" />
                            : <Square size={16} />
                          }
                        </button>
                      </th>
                    )}
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restaurant</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Open/Close</th>
                    <th className="w-12 px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentRestaurants.map((restaurant, idx) => {
                    const detail = restaurantDetails[restaurant.uid];
                    const loadingDetail = detailsLoading[restaurant.uid];
                    const selected = selectedIds.has(restaurant.uid);
                    return (
                      <motion.tr
                        key={restaurant.uid}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        onClick={() => handleView(restaurant)}
                        className={`group cursor-pointer transition-all duration-150
                          ${selected ? "bg-indigo-50/40" : "hover:bg-gray-50"}
                          ${idx % 2 === 1 && !selected ? "bg-gray-50/30" : ""}
                        `}
                      >
                        {/* Checkbox */}
                        {!restaurantAdmin && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelect(restaurant.uid)} className="text-gray-300 hover:text-indigo-600 transition-colors">
                              {selected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                            </button>
                          </td>
                        )}

                        {/* Restaurant Name + Cuisine */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                              {restaurant.restaurant_name?.charAt(0) || "?"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-gray-900 truncate max-w-[160px] group-hover:text-indigo-600 transition-colors">
                                  {restaurant.restaurant_name}
                                </span>
                                <VerificationBadge verified={restaurant.verified} />
                              </div>
                              {detail?.cuisines?.length > 0 && (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {detail.cuisines.slice(0, 2).map((c, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-medium">
                                      {typeof c === "string" ? c : c.name || c}
                                    </span>
                                  ))}
                                  {detail.cuisines.length > 2 && (
                                    <span className="text-[10px] text-gray-400">+{detail.cuisines.length - 2}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3">
                          {loadingDetail ? (
                            <div className="space-y-1">
                              <div className="h-3 w-24 bg-gray-100 rounded animate-skeleton" />
                              <div className="h-3 w-16 bg-gray-100 rounded animate-skeleton" />
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-600 truncate max-w-[140px]">{detail?.email || "—"}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{detail?.phone || "—"}</p>
                            </div>
                          )}
                        </td>

                        {/* City */}
                        <td className="px-4 py-3">
                          {loadingDetail ? (
                            <div className="h-5 w-16 bg-gray-100 rounded animate-skeleton" />
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                              <MapPin size={11} />
                              {detail?.city || "—"}
                            </span>
                          )}
                        </td>

                        {/* Rating */}
                        <td className="px-4 py-3">
                          {loadingDetail ? (
                            <div className="h-4 w-16 bg-gray-100 rounded animate-skeleton" />
                          ) : (
                            <RatingStars rating={detail?.rating} />
                          )}
                        </td>

                        {/* Registration Date */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Calendar size={13} className="text-gray-300" />
                            {formatDate(restaurant.createdAt)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusPill restaurant={restaurant} />
                        </td>

                        {/* Open/Close */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <OpenCloseButton
                              restaurant={restaurant}
                              onClick={handleToggle}
                              loading={toggleLoading[restaurant.uid]}
                              compact
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              onClick={() => handleView(restaurant)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              View
                            </button>
                            <ActionMenu
                              restaurant={restaurant}
                              onView={handleView}
                              onEdit={handleView}
                              onDelete={handleDeleteClick}
                              onBlock={handleBlock}
                              canModerate={!restaurantAdmin}
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

          {/* ── Mobile Card View ── */}
          <div className="md:hidden space-y-3">
            {currentRestaurants.map((restaurant, idx) => (
              <MobileRestaurantCard
                key={restaurant.uid}
                restaurant={restaurant}
                details={restaurantDetails}
                detailsLoading={detailsLoading}
                selected={selectedIds.has(restaurant.uid)}
                onSelect={toggleSelect}
                onView={handleView}
                onToggle={handleToggle}
                toggleLoading={toggleLoading}
                onDelete={handleDeleteClick}
                onBlock={handleBlock}
                canModerate={!restaurantAdmin}
              />
            ))}
          </div>

          {/* ── Pagination ── */}
          <div className="sticky bottom-0 mt-4 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            {/* Rows per page */}
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
                {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length}
              </span>
            </div>

            {/* Page navigation */}
            {totalPages > 1 && (
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
                    <span key={`e${idx}`} className="px-1.5 text-xs text-gray-300">…</span>
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
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

// ─── Loading Skeleton ─────────────────────────────────
const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
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
            <div className="h-4 w-20 bg-gray-100 rounded animate-skeleton" />
            <div className="h-6 w-12 bg-gray-200 rounded-full animate-skeleton" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Empty State ─────────────────────────────────────
const EmptyState = ({ searchTerm, onReset }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center"
  >
    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
      <UtensilsCrossed size={32} className="text-gray-300" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-1">
      {searchTerm ? "No restaurants found" : "No restaurants yet"}
    </h3>
    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
      {searchTerm
        ? "Try adjusting your search or filters to find what you're looking for"
        : "Restaurants will appear here once they register on the platform"
      }
    </p>
    {searchTerm && (
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200"
      >
        <RefreshCw size={15} />
        Reset Filters
      </button>
    )}
  </motion.div>
);

export default RestaurantsList;
