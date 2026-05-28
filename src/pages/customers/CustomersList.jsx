import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Download, Users, UserCheck, UserX, UserPlus,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  RotateCcw, Eye, ShieldOff, Shield,
  Mail, Phone, Copy, Filter, ArrowUpDown, Calendar,
  MapPin, CheckSquare, Square, MoreVertical,
  Loader2, RefreshCw, ChevronDown, BadgeCheck,
  Store, Clock, Globe, DollarSign, ShoppingCart,
} from "lucide-react";
import {
  getAllCustomers,
  getCustomerStats,
  updateCustomerStatus,
  getCustomerById,
  deleteCustomer,
  getCustomerCities,
  getCustomerStates,
  exportCustomers,
  bulkUpdateCustomerStatus,
} from "../../services/api";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import RefundManagement from "./RefundManagement";

const mapUserToCustomer = (user) => {
  const fullName = `${user.profile?.first_name || ""} ${user.profile?.last_name || ""}`.trim();
  return {
    id: user.id,
    customerId: user.uid,
    name: fullName || "N/A",
    email: user.contact?.encryptedEmail || user.contact?.email || "N/A",
    mobile: user.contact?.encryptedPhone || user.contact?.phone || "N/A",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isActive: user.isActive,
    status: user.isActive ? "active" : "blocked",
    city: user.address?.city || "—",
    state: user.address?.state || "—",
    providerType: user.providerType || "N/A",
    profile: user.profile,
    contact: user.contact,
    address: user.address,
  };
};

const getInitials = (name) => {
  if (!name || name === "N/A") return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() || "?";
};

const avatarColors = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
];

const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

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

const getStatusBadge = (status) => {
  switch (status) {
    case "active":
      return { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20", dot: "bg-emerald-500", label: "Active" };
    case "blocked":
      return { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-600/20", dot: "bg-red-500", label: "Blocked" };
    default:
      return { bg: "bg-gray-50", text: "text-gray-700", ring: "ring-gray-600/20", dot: "bg-gray-400", label: status };
  }
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

const ActionMenu = ({ customer, onView, onBlock }) => {
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
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onView(customer); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Eye size={14} />
              View Customer
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onBlock(customer); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${
                customer.isActive ? "text-red-500 hover:bg-red-50" : "text-emerald-500 hover:bg-emerald-50"
              }`}
            >
              {customer.isActive ? <ShieldOff size={14} /> : <Shield size={14} />}
              {customer.isActive ? "Block Customer" : "Unblock Customer"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomersList = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("users");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [statusFilter, setStatusFilter] = useState("all");
  const [regDateFilter, setRegDateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [loginMethodFilter, setLoginMethodFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    blocked: 0,
    newToday: 0,
  });

  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);

  const [copiedId, setCopiedId] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const [showDateRange, setShowDateRange] = useState(false);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch filter options
  useEffect(() => {
    getCustomerCities().then((res) => {
      const data = res.data?.data || res.data || [];
      setCities(Array.isArray(data) ? data : []);
    }).catch(() => {});
    getCustomerStates().then((res) => {
      const data = res.data?.data || res.data || [];
      setStates(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        city: cityFilter !== "all" ? cityFilter : undefined,
        state: stateFilter !== "all" ? stateFilter : undefined,
        registrationDate: regDateFilter !== "all" ? regDateFilter : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        loginMethod: loginMethodFilter !== "all" ? loginMethodFilter : undefined,
      };
      const response = await getAllCustomers(params);
      const users = response.data?.data || [];
      const meta = response.data?.meta;
      setCustomers(users.map(mapUserToCustomer));
      if (meta) setPagination(meta);
    } catch (err) {
      console.error("Fetch failed:", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, sortBy, sortOrder, cityFilter, stateFilter, regDateFilter, fromDate, toDate, loginMethodFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Stats
  useEffect(() => {
    getCustomerStats().then((statsRes) => {
      const d = statsRes.data?.data || {};
      setStats({
        total: d.total || 0,
        active: d.active || 0,
        blocked: d.inactive || d.blocked || 0,
        newToday: d.newToday || 0,
      });
    }).catch(() => {});
  }, []);

  const handleStatusToggle = async (c) => {
    try {
      const newStatus = c.isActive ? 0 : 1;
      await updateCustomerStatus(c.customerId, { status: newStatus, isActive: newStatus });
      toast.success(c.isActive ? "Customer blocked" : "Customer unblocked");
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleView = (customer) => {
    navigate(`/customers/${customer.customerId}`);
  };

  const handleExport = async (exportAll = false) => {
    if (!customers.length && !exportAll) {
      toast.error("No data to export");
      return;
    }
    setExportLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: exportAll ? 10000 : itemsPerPage,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        city: cityFilter !== "all" ? cityFilter : undefined,
        state: stateFilter !== "all" ? stateFilter : undefined,
        registrationDate: regDateFilter !== "all" ? regDateFilter : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        loginMethod: loginMethodFilter !== "all" ? loginMethodFilter : undefined,
        exportAll: exportAll || undefined,
        format: "csv",
      };
      const res = await exportCustomers(params);
      const csvData = res.data?.data || "";
      const meta = res.data?.meta || {};

      const filterParts = [];
      if (statusFilter !== "all") filterParts.push(statusFilter);
      if (cityFilter !== "all") filterParts.push(cityFilter);
      if (regDateFilter !== "all") filterParts.push(regDateFilter);
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "").slice(0, 6);
      const filename = filterParts.length > 0
        ? `customers_${filterParts.join("_")}_${dateStr}.csv`
        : `customers_${dateStr}.csv`;

      saveAs(new Blob([csvData], { type: "text/csv;charset=utf-8;" }), filename);
      toast.success(`Exported ${meta.exported || customers.length} customer(s)`);
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) { toast.error("No customers selected"); return; }
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    try {
      if (action === "block") {
        for (const uid of ids) {
          try { await updateCustomerStatus(uid, { status: 0, isActive: 0 }); } catch {}
        }
        toast.success(`${ids.length} customer(s) blocked`);
      } else if (action === "unblock") {
        for (const uid of ids) {
          try { await updateCustomerStatus(uid, { status: 1, isActive: 1 }); } catch {}
        }
        toast.success(`${ids.length} customer(s) unblocked`);
      }
      setSelectedIds(new Set());
      fetchCustomers();
    } catch (err) {
      toast.error("Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
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
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.customerId)));
    }
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setRegDateFilter("all");
    setCityFilter("all");
    setStateFilter("all");
    setLoginMethodFilter("all");
    setFromDate("");
    setToDate("");
    setShowDateRange(false);
    setSearchTerm("");
    setDebouncedSearch("");
    setCurrentPage(1);
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(column);
      setSortOrder("DESC");
    }
    setCurrentPage(1);
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

  const hasActiveFilters = statusFilter !== "all" || regDateFilter !== "all" || cityFilter !== "all" || stateFilter !== "all" || loginMethodFilter !== "all" || fromDate || toDate || debouncedSearch;

  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-3"><div className="h-4 w-4 bg-gray-200 rounded" /></td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-full shrink-0" />
              <div className="min-w-0">
                <div className="h-4 bg-gray-200 rounded w-28 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3 hidden md:table-cell">
            <div className="h-4 bg-gray-200 rounded w-36 mb-1.5" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </td>
          <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-gray-200 rounded w-20" /></td>
          <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-gray-200 rounded w-16" /></td>
          <td className="px-4 py-3"><div className="h-6 bg-gray-200 rounded-full w-16" /></td>
          <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
          <td className="px-4 py-3"><div className="h-8 bg-gray-200 rounded-lg w-12" /></td>
        </tr>
      ))}
    </>
  );

  const EmptyState = () => (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Users className="text-gray-400" size={28} />
      </div>
      <h3 className="text-base font-semibold text-gray-600 mb-1">
        {debouncedSearch || hasActiveFilters ? "No matching customers" : "No customers yet"}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">
        {debouncedSearch || hasActiveFilters
          ? "Try adjusting your search or filter criteria"
          : "Customer accounts will appear here once users start registering"}
      </p>
      {(debouncedSearch || hasActiveFilters) && (
        <button
          onClick={resetFilters}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200"
        >
          <RefreshCw size={15} />
          Reset Filters
        </button>
      )}
    </div>
  );

  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.totalPages;
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
    { key: "total", label: "Total Users", icon: Users, color: "bg-blue-50 text-blue-600" },
    { key: "active", label: "Active Users", icon: UserCheck, color: "bg-emerald-50 text-emerald-600" },
    { key: "blocked", label: "Blocked Users", icon: UserX, color: "bg-red-50 text-red-600" },
    { key: "newToday", label: "New Today", icon: UserPlus, color: "bg-amber-50 text-amber-600" },
  ];

  const loginMethodOptions = [
    { label: "All Methods", value: "all" },
    { label: "Google", value: "google" },
    { label: "Phone", value: "phone" },
    { label: "Email/Password", value: "password" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50/80">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Customer Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, account status, refunds, and account activity</p>
      </div>

      {/* Stats Cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        {statCards.map((stat) => {
          const value = stats[stat.key] || 0;
          return <StatCard key={stat.key} icon={stat.icon} label={stat.label} value={value.toLocaleString()} color={stat.color} />;
        })}
      </motion.div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        {/* Tabs */}
        <div className="border-b border-gray-100">
          <div className="flex px-4 lg:px-6">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === "users"
                  ? "text-indigo-600 border-indigo-500"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              User Information
            </button>
            <button
              disabled
              className="px-4 py-3 text-sm text-gray-400 cursor-not-allowed flex items-center gap-2 border-b-2 border-transparent"
            >
              <span>Refund</span>
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200/60">
                Coming Soon
              </span>
            </button>
          </div>
        </div>

        {activeTab === "users" ? (
          <div className="p-4 lg:p-6 space-y-4">
            {/* Filter + Search Bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="p-3 md:p-4 space-y-3">
                {/* Row 1: Search + Sort + Export + Reset */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      defaultValue={searchTerm}
                      placeholder="Search by name, email, phone, ID..."
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
                      { label: "Name A-Z", value: "name_ASC" },
                      { label: "Name Z-A", value: "name_DESC" },
                      { label: "Last Active", value: "lastActive_DESC" },
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
                    disabled={!customers.length || exportLoading}
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
                  </span>

                  <FilterDropdown
                    label="Status"
                    icon={null}
                    value={statusFilter}
                    options={[
                      { label: "All Status", value: "all" },
                      { label: "Active", value: "active" },
                      { label: "Blocked", value: "blocked" },
                      { label: "New Users", value: "new" },
                    ]}
                    onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                    onClear={() => setStatusFilter("all")}
                  />

                  <FilterDropdown
                    label="Registered"
                    icon={Calendar}
                    value={regDateFilter}
                    options={[
                      { label: "All Time", value: "all" },
                      { label: "Today", value: "today" },
                      { label: "Last 7 Days", value: "last7" },
                      { label: "Last 30 Days", value: "last30" },
                      { label: "Custom Range", value: "custom" },
                    ]}
                    onChange={(v) => { setRegDateFilter(v); setCurrentPage(1); if (v !== "custom") setShowDateRange(false); else setShowDateRange(true); }}
                    onClear={() => { setRegDateFilter("all"); setShowDateRange(false); setFromDate(""); setToDate(""); }}
                  />

                  {showDateRange && (
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

                  <FilterDropdown
                    label="City"
                    icon={MapPin}
                    value={cityFilter}
                    options={[{ label: "All Cities", value: "all" }, ...cities.map((c) => ({ label: c, value: c }))]}
                    onChange={(v) => { setCityFilter(v); setCurrentPage(1); }}
                    onClear={() => setCityFilter("all")}
                  />

                  <FilterDropdown
                    label="State"
                    icon={MapPin}
                    value={stateFilter}
                    options={[{ label: "All States", value: "all" }, ...states.map((s) => ({ label: s, value: s }))]}
                    onChange={(v) => { setStateFilter(v); setCurrentPage(1); }}
                    onClear={() => setStateFilter("all")}
                  />

                  <FilterDropdown
                    label="Login Method"
                    icon={Globe}
                    value={loginMethodFilter}
                    options={loginMethodOptions}
                    onChange={(v) => { setLoginMethodFilter(v); setCurrentPage(1); }}
                    onClear={() => setLoginMethodFilter("all")}
                  />

                  {customers.length < pagination.total && (
                    <span className="text-xs text-gray-400 ml-1">
                      {customers.length} of {pagination.total} results
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bulk Action Bar */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium">
                    <CheckSquare size={16} />
                    {selectedIds.size} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkAction("unblock")}
                      disabled={bulkLoading}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      Unblock All
                    </button>
                    <button
                      onClick={() => handleBulkAction("block")}
                      disabled={bulkLoading}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      Block All
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

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto -mx-4 lg:-mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="w-10 px-4 lg:px-6 py-3.5 text-left">
                      <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                        {selectedIds.size === customers.length && customers.length > 0
                          ? <CheckSquare size={16} className="text-indigo-600" />
                          : <Square size={16} />
                        }
                      </button>
                    </th>
                    <SortHeader column="name" label="Customer" />
                    <SortHeader column="createdAt" label="Joined Date" className="hidden lg:table-cell" />
                    <SortHeader column="lastActive" label="Last Active" className="hidden xl:table-cell" />
                    <th className="px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Contact Info
                    </th>
                    <SortHeader column="status" label="Status" />
                    <th className="px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      City
                    </th>
                    <th className="px-4 lg:px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <TableSkeleton />
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 lg:px-6">
                        <EmptyState />
                      </td>
                    </tr>
                  ) : (
                    customers.map((c, idx) => {
                      const badge = getStatusBadge(c.status);
                      const initials = getInitials(c.name);
                      const avatarColor = getAvatarColor(c.name);
                      const selected = selectedIds.has(c.customerId);
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02, duration: 0.2 }}
                          onClick={() => handleView(c)}
                          className={`group cursor-pointer transition-all duration-150
                            ${selected ? "bg-indigo-50/40" : "hover:bg-gray-50"}
                            ${idx % 2 === 1 && !selected ? "bg-gray-50/30" : ""}
                          `}
                        >
                          {/* Checkbox */}
                          <td className="px-4 lg:px-6 py-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelect(c.customerId)} className="text-gray-300 hover:text-indigo-600 transition-colors">
                              {selected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                            </button>
                          </td>

                          {/* Customer */}
                          <td className="px-4 lg:px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate max-w-[160px] lg:max-w-[200px] group-hover:text-indigo-600 transition-colors">
                                  {c.name}
                                </div>
                                <div className="text-xs text-gray-400 font-mono truncate max-w-[160px] lg:max-w-[200px]">
                                  {c.customerId}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Joined Date */}
                          <td className="px-4 lg:px-6 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                              <Calendar size={13} className="text-gray-300" />
                              {formatDate(c.createdAt)}
                            </div>
                          </td>

                          {/* Last Active */}
                          <td className="px-4 lg:px-6 py-3 hidden xl:table-cell">
                            <span className="text-sm text-gray-500">{getTimeAgo(c.updatedAt) || "—"}</span>
                          </td>

                          {/* Contact Info */}
                          <td className="px-4 lg:px-6 py-3 hidden md:table-cell">
                            <div className="flex items-center gap-2 group/email">
                              <Mail size={12} className="text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-600 truncate max-w-[160px]">{c.email}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopy(c.email, `email-${c.id}`); }}
                                className="opacity-0 group-hover/email:opacity-100 transition-opacity shrink-0"
                                title="Copy email"
                              >
                                {copiedId === `email-${c.id}` ? (
                                  <span className="text-[10px] text-emerald-600 font-medium">Copied!</span>
                                ) : (
                                  <Copy size={12} className="text-gray-400 hover:text-gray-600" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-1 group/phone">
                              <Phone size={12} className="text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-500 truncate max-w-[160px]">{c.mobile}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopy(c.mobile, `phone-${c.id}`); }}
                                className="opacity-0 group-hover/phone:opacity-100 transition-opacity shrink-0"
                                title="Copy phone"
                              >
                                <Copy size={12} className="text-gray-400 hover:text-gray-600" />
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 lg:px-6 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>

                          {/* City */}
                          <td className="px-4 lg:px-6 py-3 hidden lg:table-cell">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                              <MapPin size={11} />
                              {c.city}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 lg:px-6 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleView(c)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                              >
                                <Eye size={14} />
                                <span className="hidden sm:inline">View</span>
                              </button>
                              <ActionMenu customer={c} onView={handleView} onBlock={handleStatusToggle} />
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </div>
                    </div>
                  </div>
                ))
              ) : customers.length === 0 ? (
                <EmptyState />
              ) : (
                customers.map((c) => {
                  const badge = getStatusBadge(c.status);
                  const initials = getInitials(c.name);
                  const avatarColor = getAvatarColor(c.name);
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3"
                      onClick={() => handleView(c)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <ActionMenu customer={c} onView={handleView} onBlock={handleStatusToggle} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-gray-400" />
                          <span className="truncate max-w-[120px]">{c.email}</span>
                        </div>
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className="sticky bottom-0 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-gray-400">
                  {customers.length > 0
                    ? `${
                        (currentPage - 1) * itemsPerPage + 1
                      }–${
                        Math.min(currentPage * itemsPerPage, pagination.total)
                      } of ${pagination.total}`
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
                    disabled={currentPage <= 1}
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
          </div>
        ) : (
          <RefundManagement />
        )}
      </div>
    </div>
  );
};

export default CustomersList;
