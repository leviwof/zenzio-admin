import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Download, Users, UserCheck, UserX, UserPlus,
  ChevronLeft, ChevronRight, RotateCcw, Eye, ShieldOff, Shield,
  Mail, Phone, Copy
} from "lucide-react";
import {
  getAllCustomers,
  getCustomerStats,
  updateCustomerStatus,
  getCustomerById,
} from "../../services/api";
import { saveAs } from "file-saver";
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
    isActive: user.isActive,
    status: user.isActive ? "active" : "blocked",
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

const statCards = [
  { key: "total", label: "Total Users", icon: Users, color: "blue" },
  { key: "active", label: "Active Users", icon: UserCheck, color: "green" },
  { key: "blocked", label: "Blocked Users", icon: UserX, color: "red" },
  { key: "newToday", label: "New Today", icon: UserPlus, color: "amber" },
];

const statColors = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
  green: { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
  red: { bg: "bg-red-50", text: "text-red-600", iconBg: "bg-red-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
};

const CustomersList = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("users");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const [copiedId, setCopiedId] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pagination.limit,
        search: searchTerm || undefined,
        sortBy: sortBy || undefined,
        status:
          statusFilter === "All"
            ? undefined
            : statusFilter === "Active"
              ? 1
              : 0,
      };
      const response = await getAllCustomers(params);
      const users = response.data?.data || [];
      const meta = response.data?.meta;
      setCustomers(users.map(mapUserToCustomer));
      setPagination(meta);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchCustomers();

    const fetchStats = async () => {
      try {
        const statsRes = await getCustomerStats();
        const d = statsRes.data?.data || {};
        setStats({
          total: d.total || 0,
          active: d.active || 0,
          blocked: d.blocked || 0,
          newToday: d.newToday || 0,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };
    fetchStats();
  }, [searchTerm, statusFilter, sortBy, pagination.limit]);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage]);

  const handleStatusToggle = async (c) => {
    try {
      const newStatus = c.isActive ? 0 : 1;
      await updateCustomerStatus(c.customerId, {
        status: newStatus,
        isActive: newStatus,
      });
      fetchCustomers();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setSortBy("");
  };

  const normalizeCustomer = (c) => {
    const firstName = c?.profile?.first_name ?? "";
    const lastName = c?.profile?.last_name ?? "";
    return {
      name: `${firstName} ${lastName}`.trim() || "N/A",
      uid: c?.uid ?? "",
      email: c?.contact?.email ?? "N/A",
      mobile: c?.contact?.mobile ?? "N/A",
      status: c?.status ? "Active" : "Blocked",
      isActive: c?.isActive ? "Available" : "Unavailable",
      createdAt: c?.createdAt ?? "",
    };
  };

  const handleExport = async () => {
    if (!customers.length) return;
    const detailed = await Promise.all(
      customers.map(async (c) => {
        try {
          const res = await getCustomerById(c.customerId);
          return res.data;
        } catch {
          return null;
        }
      })
    );
    const csvHeader = [
      "Name", "UID", "Email", "Mobile", "Status", "Availability", "Created At",
    ].join(",");
    const csvRows = detailed.filter(Boolean).map((c) => {
      const customer = normalizeCustomer(c);
      return [
        customer.name, customer.uid, customer.email, customer.mobile,
        customer.status, customer.isActive, customer.createdAt,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [csvHeader, ...csvRows].join("\n");
    saveAs(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `customers-${Date.now()}.csv`
    );
  };

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard not available
    }
  };

  const hasActiveFilters = searchTerm || statusFilter !== "All" || sortBy;

  const getStatValue = (key) => {
    if (key === "total") return stats.total;
    if (key === "active") return stats.active || customers.filter((c) => c.isActive).length;
    if (key === "blocked") return stats.blocked || customers.filter((c) => !c.isActive).length;
    if (key === "newToday") {
      if (stats.newToday) return stats.newToday;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return customers.filter((c) => {
        const d = new Date(c.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }).length;
    }
    return 0;
  };

  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-full shrink-0" />
              <div className="min-w-0">
                <div className="h-4 bg-gray-200 rounded w-28 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
            </div>
          </td>
          <td className="px-4 py-4 hidden md:table-cell">
            <div className="h-4 bg-gray-200 rounded w-36 mb-1.5" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </td>
          <td className="px-4 py-4 hidden lg:table-cell">
            <div className="h-4 bg-gray-200 rounded w-24" />
          </td>
          <td className="px-4 py-4">
            <div className="h-6 bg-gray-200 rounded-full w-16" />
          </td>
          <td className="px-4 py-4">
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded-lg w-20" />
              <div className="h-8 bg-gray-200 rounded-lg w-16" />
            </div>
          </td>
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
        {searchTerm || statusFilter !== "All" ? "No matching customers" : "No customers yet"}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">
        {searchTerm || statusFilter !== "All"
          ? "Try adjusting your search or filter criteria"
          : "Customer accounts will appear here once users start registering"}
      </p>
      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
            Customer Management
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Manage users, account status, refunds, and account activity.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          const sc = statColors[stat.color];
          const value = getStatValue(stat.key);
          return (
            <div
              key={stat.key}
              className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5 flex items-center gap-3 lg:gap-4 shadow-xs hover:shadow-sm transition-shadow"
            >
              <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center shrink-0 ${sc.iconBg}`}>
                <IconComponent className={sc.text} size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
                  {value.toLocaleString()}
                </p>
                <p className="text-xs lg:text-sm text-gray-500 truncate">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        {/* Tabs */}
        <div className="border-b border-gray-100">
          <div className="flex px-4 lg:px-6">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === "users"
                  ? "text-red-600 border-red-500"
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
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <input
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all bg-white"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all appearance-none cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Sort By</option>
                  <option value="createdAt_desc">Newest First</option>
                  <option value="createdAt_asc">Oldest First</option>
                  <option value="name_asc">Name A–Z</option>
                  <option value="name_desc">Name Z–A</option>
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-1.5 transition-colors"
                    title="Reset filters"
                  >
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}

                <button
                  onClick={handleExport}
                  disabled={!customers.length}
                  className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-4 lg:-mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Contact Info
                    </th>
                    <th className="px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Joined Date
                    </th>
                    <th className="px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 lg:px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <TableSkeleton />
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6">
                        <EmptyState />
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => {
                      const badge = getStatusBadge(c.status);
                      const initials = getInitials(c.name);
                      const avatarColor = getAvatarColor(c.name);
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-gray-50/80 transition-colors group"
                        >
                          {/* Customer */}
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate max-w-[160px] lg:max-w-[200px]">
                                  {c.name}
                                </div>
                                <div className="text-xs text-gray-400 font-mono truncate max-w-[160px] lg:max-w-[200px]">
                                  {c.customerId}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                            <div className="flex items-center gap-2 group/email">
                              <Mail size={12} className="text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-600 truncate max-w-[160px]">
                                {c.email}
                              </span>
                              <button
                                onClick={() => handleCopy(c.email, `email-${c.id}`)}
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
                              <span className="text-xs text-gray-500 truncate max-w-[160px]">
                                {c.mobile}
                              </span>
                              <button
                                onClick={() => handleCopy(c.mobile, `phone-${c.id}`)}
                                className="opacity-0 group-hover/phone:opacity-100 transition-opacity shrink-0"
                                title="Copy phone"
                              >
                                <Copy size={12} className="text-gray-400 hover:text-gray-600" />
                              </button>
                            </div>
                          </td>

                          {/* Joined Date */}
                          <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-gray-600 whitespace-nowrap">
                                {formatDate(c.createdAt)}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 lg:px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/customers/${c.customerId}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <Eye size={14} />
                                <span className="hidden sm:inline">View</span>
                              </button>
                              <button
                                onClick={() => handleStatusToggle(c)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                  c.isActive
                                    ? "text-red-700 bg-red-50 hover:bg-red-100"
                                    : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                }`}
                              >
                                {c.isActive ? <ShieldOff size={14} /> : <Shield size={14} />}
                                <span className="hidden sm:inline">{c.isActive ? "Block" : "Unblock"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
              <p className="text-sm text-gray-500 order-2 sm:order-1">
                {customers.length > 0 ? (
                  <>Showing <span className="font-medium text-gray-700">{(currentPage - 1) * pagination.limit + 1}</span>–<span className="font-medium text-gray-700">{Math.min(currentPage * pagination.limit, pagination.total)}</span> of <span className="font-medium text-gray-700">{pagination.total}</span></>
                ) : (
                  <>No results</>
                )}
              </p>

              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="w-8 h-8 flex items-center justify-center text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${
                        currentPage === p
                          ? "bg-red-600 text-white shadow-xs"
                          : "text-gray-600 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage >= pagination.totalPages}
                  className="w-8 h-8 flex items-center justify-center text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>

                <select
                  value={pagination.limit}
                  onChange={(e) =>
                    setPagination((p) => ({ ...p, limit: Number(e.target.value) }))
                  }
                  className="ml-2 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 cursor-pointer"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
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
