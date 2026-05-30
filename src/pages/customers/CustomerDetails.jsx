import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, Mail, Phone, Trash2, MapPin, Calendar,
  Shield, ShieldOff, ShoppingCart, DollarSign, CreditCard,
  RefreshCw, Smartphone, Globe, Award, MapPinned,
  Clock, UserCheck, BadgeCheck, XCircle, AlertCircle,
  Edit3, Copy, MessageSquare, Activity,
} from "lucide-react";
import {
  getCustomerById,
  updateCustomerStatus,
  deleteCustomer,
  getCustomerOrders,
} from "../../services/api";
import toast from "react-hot-toast";
import { getCustomerStatus, isCustomerActive } from "../../utils/customerStatus";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name) => {
  if (!name || name === "N/A") return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() || "?";
};

const InfoCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={15} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 break-all">{value || "—"}</p>
    </div>
  </div>
);

const StatBadge = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
);

const normalizeCustomer = (response) => {
  const user = response?.data;
  return {
    id: user?.id,
    uid: user?.uid,
    personalInfo: {
      uid: user?.uid,
      name: user?.profile
        ? `${user.profile.first_name ?? ""} ${user.profile.last_name ?? ""}`.trim()
        : "N/A",
      email: user?.contact?.encryptedEmail ?? user?.contact?.email ?? "N/A",
      mobile: user?.contact?.encryptedPhone ?? user?.contact?.phone ?? "N/A",
      birthday: user?.profile?.dob ?? null,
      anniversary: user?.profile?.anniversary ?? null,
      memberSince: user?.createdAt ?? null,
      lastActive: user?.updatedAt ?? null,
      gender: user?.profile?.gender ?? "Not specified",
      profilePhoto: user?.profile?.photo?.[0] ?? null,
      status: getCustomerStatus(user),
      isActive: isCustomerActive(user),
      providerType: user?.providerType ?? "N/A",
      verificationFlags: user?.verificationFlags ?? 0,
      notificationsEnabled: user?.notificationsEnabled ?? false,
    },
    savedAddresses: user?.address ? [user.address] : [],
    bankDetails: user?.bank_details ?? null,
    accountActivity: {
      totalOrders: user?.totalOrders ?? 0,
      totalSpent: user?.totalSpent ?? 0,
    },
  };
};

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    if (id) { fetchCustomerDetails(); fetchOrders(); }
  }, [id]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await getCustomerById(id);
      const normalized = normalizeCustomer(response);
      setCustomer(normalized);
    } catch (error) {
      console.error("Error fetching customer:", error);
      toast.error("Failed to load customer details");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await getCustomerOrders(id);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!customer?.uid) return;
    try {
      setStatusUpdating(true);
      const newValue = customer.personalInfo.isActive ? 0 : 1;
      await updateCustomerStatus(customer.uid, { status: newValue, isActive: newValue });
      toast.success(customer.personalInfo.isActive ? "Customer blocked" : "Customer unblocked");
      await fetchCustomerDetails();
    } catch (error) {
      toast.error("Status update failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this customer? This action cannot be undone.")) return;
    if (!customer?.uid) return;
    try {
      setLoading(true);
      await deleteCustomer(customer.uid);
      toast.success("Customer deleted");
      navigate("/customers");
    } catch (error) {
      toast.error("Delete failed");
      setLoading(false);
    }
  };

  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen text-center">
        <h2 className="text-xl font-semibold">Customer not found</h2>
        <button onClick={() => navigate("/customers")} className="mt-4 text-indigo-600 hover:underline">
          Back to Customers
        </button>
      </div>
    );
  }

  const { personalInfo, savedAddresses = [], accountActivity = {}, bankDetails } = customer;
  const initials = getInitials(personalInfo.name);

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Orders" },
    { id: "addresses", label: "Addresses" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/customers")}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-medium text-sm">Back to Customers</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStatusToggle}
              disabled={statusUpdating}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                personalInfo.isActive
                  ? "text-red-600 bg-red-50 hover:bg-red-100"
                  : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
              }`}
            >
              {statusUpdating ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : personalInfo.isActive ? (
                <ShieldOff size={14} />
              ) : (
                <Shield size={14} />
              )}
              {personalInfo.isActive ? "Block" : "Unblock"}
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm">
                {personalInfo.profilePhoto ? (
                  <img src={personalInfo.profilePhoto} alt={personalInfo.name} className="w-full h-full object-cover rounded-full" />
                ) : initials}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {personalInfo.name}
                  {personalInfo.verificationFlags > 0 && (
                    <BadgeCheck size={18} className="text-blue-500" />
                  )}
                </h1>
                <p className="text-sm text-gray-500 font-mono">{personalInfo.uid}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    personalInfo.isActive
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                      : "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${personalInfo.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                    {personalInfo.isActive ? "Active" : "Blocked"}
                  </span>
                  <span className="text-xs text-gray-400">
                    Member since {formatDate(personalInfo.memberSince)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 md:ml-auto">
              <StatBadge icon={ShoppingCart} label="Total Orders" value={accountActivity.totalOrders} color="bg-blue-50 text-blue-600" />
              <StatBadge icon={DollarSign} label="Total Spent" value={`₹${accountActivity.totalSpent}`} color="bg-emerald-50 text-emerald-600" />
              <StatBadge icon={Activity} label="Last Active" value={formatDate(personalInfo.lastActive)} color="bg-amber-50 text-amber-600" />
            </div>
          </div>
        </motion.div>

        {/* Section Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="border-b border-gray-100 px-4">
            <div className="flex gap-1 -mb-px overflow-x-auto">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    activeSection === section.id
                      ? "text-indigo-600 border-indigo-500"
                      : "text-gray-500 border-transparent hover:text-gray-700"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-6">
            {activeSection === "overview" && (
              <div className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail size={15} className="text-gray-400" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoCard
                      icon={Mail}
                      label="Email"
                      value={personalInfo.email}
                      color="bg-blue-50 text-blue-600"
                    />
                    <InfoCard
                      icon={Phone}
                      label="Phone"
                      value={personalInfo.mobile}
                      color="bg-emerald-50 text-emerald-600"
                    />
                    <InfoCard
                      icon={Globe}
                      label="Login Method"
                      value={personalInfo.providerType}
                      color="bg-purple-50 text-purple-600"
                    />
                    <InfoCard
                      icon={Calendar}
                      label="Member Since"
                      value={formatDateTime(personalInfo.memberSince)}
                      color="bg-amber-50 text-amber-600"
                    />
                    <InfoCard
                      icon={Clock}
                      label="Last Active"
                      value={getTimeAgo(personalInfo.lastActive)}
                      color="bg-cyan-50 text-cyan-600"
                    />
                    <InfoCard
                      icon={UserCheck}
                      label="Notifications"
                      value={personalInfo.notificationsEnabled ? "Enabled" : "Disabled"}
                      color="bg-rose-50 text-rose-600"
                    />
                  </div>
                </div>

                {/* Personal Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award size={15} className="text-gray-400" />
                    Personal Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <InfoCard
                      icon={Calendar}
                      label="Date of Birth"
                      value={formatDate(personalInfo.birthday)}
                      color="bg-pink-50 text-pink-600"
                    />
                    <InfoCard
                      icon={Calendar}
                      label="Anniversary"
                      value={formatDate(personalInfo.anniversary)}
                      color="bg-orange-50 text-orange-600"
                    />
                    <InfoCard
                      icon={BadgeCheck}
                      label="Verification"
                      value={personalInfo.verificationFlags > 0 ? "Verified" : "Unverified"}
                      color="bg-indigo-50 text-indigo-600"
                    />
                  </div>
                </div>

                {/* Bank Details */}
                {bankDetails && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CreditCard size={15} className="text-gray-400" />
                      Bank Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <InfoCard icon={CreditCard} label="Bank Name" value={bankDetails.bank_name || "—"} color="bg-sky-50 text-sky-600" />
                      <InfoCard icon={CreditCard} label="Account Number" value={bankDetails.account_number || "—"} color="bg-sky-50 text-sky-600" />
                      <InfoCard icon={CreditCard} label="IFSC Code" value={bankDetails.ifsc_code || "—"} color="bg-sky-50 text-sky-600" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === "orders" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <ShoppingCart size={15} className="text-gray-400" />
                    Order History
                  </h3>
                  <span className="text-xs text-gray-500">{orders.length} order(s)</span>
                </div>
                {ordersLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                        <div className="h-3 bg-gray-100 rounded w-32" />
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart size={36} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {order.restaurant_name || "Unknown Restaurant"}
                              </p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                order.deliveryPartnerStatus === "delivered"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : order.restaurantStatus === "rejected" || order.restaurantStatus === "cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : order.restaurantStatus === "accepted" || order.restaurantStatus === "preparing" || order.restaurantStatus === "ready"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}>
                                {order.deliveryPartnerStatus === "delivered"
                                  ? "Delivered"
                                  : order.restaurantStatus === "rejected" || order.restaurantStatus === "cancelled"
                                  ? "Cancelled"
                                  : order.restaurantStatus === "accepted" || order.restaurantStatus === "preparing" || order.restaurantStatus === "ready"
                                  ? "Active"
                                  : order.restaurantStatus || "Pending"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">#{order.orderId}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {formatDateTime(order.time)}
                              </span>
                              <span className="font-medium text-gray-700">₹{order.price || order.item_total || 0}</span>
                            </div>
                            {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-white rounded border border-gray-100 text-gray-500">
                                    {item.name || item.dish_name || `Item ${idx + 1}`}
                                    {item.quantity > 1 && ` x${item.quantity}`}
                                  </span>
                                ))}
                                {order.items.length > 3 && (
                                  <span className="text-[10px] text-gray-400">+{order.items.length - 3} more</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-gray-400">{getTimeAgo(order.time)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === "addresses" && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPinned size={15} className="text-gray-400" />
                  Saved Addresses
                </h3>
                {savedAddresses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedAddresses.map((addr, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex items-start gap-3">
                          <MapPin size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            {addr.address && <p className="text-sm font-medium text-gray-900">{addr.address}</p>}
                            {addr.address_secondary && <p className="text-xs text-gray-500">{addr.address_secondary}</p>}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {addr.city && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                  {addr.city}
                                </span>
                              )}
                              {addr.state && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
                                  {addr.state}
                                </span>
                              )}
                              {addr.pincode && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                                  PIN: {addr.pincode}
                                </span>
                              )}
                            </div>
                            {addr.lat && addr.lng && (
                              <p className="text-xs text-gray-400 mt-2">
                                {addr.lat}, {addr.lng}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">No addresses saved</p>
                )}
              </div>
            )}

            {activeSection === "activity" && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity size={15} className="text-gray-400" />
                  Account Activity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoCard icon={Calendar} label="Account Created" value={formatDateTime(personalInfo.memberSince)} color="bg-blue-50 text-blue-600" />
                  <InfoCard icon={Clock} label="Last Updated" value={formatDateTime(personalInfo.lastActive)} color="bg-amber-50 text-amber-600" />
                  <InfoCard icon={UserCheck} label="Account Status" value={personalInfo.isActive ? "Active" : "Blocked"} color="bg-emerald-50 text-emerald-600" />
                  <InfoCard icon={Globe} label="Provider" value={personalInfo.providerType} color="bg-purple-50 text-purple-600" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getTimeAgo = (d) => {
  if (!d) return "N/A";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default CustomerDetails;
