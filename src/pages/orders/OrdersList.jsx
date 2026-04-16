// =============================================
// FILE: src/pages/orders/OrdersList.jsx
// COMPLETE REWRITE - EXACT UI MATCH
// =============================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, RefreshCw, Calendar } from "lucide-react";
import { getAllOrders, getOrderStats, getOrderMonitoringStats } from "../../services/api";
import { saveAs } from "file-saver";

const OrdersList = () => {
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]); // Store all fetched orders
  const [orders, setOrders] = useState([]); // Displayed orders
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

  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, [activeTab]); // Refetch when tab changes

  // Trigger fetch when date range changes
  useEffect(() => {
    if ((startDate && endDate) || (!startDate && !endDate)) {
      fetchOrders();
    }
  }, [startDate, endDate]);

  const fetchStats = async () => {
    try {
      const res = await getOrderMonitoringStats();
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {
        status: activeTab,
        search: searchTerm,
        startDate: startDate,
        endDate: endDate
      };

      const res = await getAllOrders(params);
      setAllOrders(res.data);
      setOrders(res.data); // Directly set orders from API response

      setPagination((prev) => ({
        ...prev,
        totalOrders: res.data.length,
        totalPages: Math.ceil(res.data.length / PAGE_SIZE),
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

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      fetchOrders();
    }
  };

  // Removed client-side filterOrders function 
  const filterOrders = () => {
    // No-op or removed
  };

  const handleExport = () => {
    if (!orders.length) {
      alert("No data to export");
      return;
    }

    const csvContent = [
      ["Order ID", "Customer", "Restaurant", "Order Time", "Total Amount", "Status", "Delivery Partner"],
      ...orders.map((o) => [
        o.id,
        o.user?.name || "N/A",
        getRestaurantName(o),
        formatOrderTime(o.createdAt),
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
    // Try to get restaurant name from cart items
    if (order.cart?.items?.[0]?.food?.restaurant?.rest_name) {
      return order.cart.items[0].food.restaurant.rest_name;
    }
    return "N/A";
  };

  const formatOrderTime = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };


  const getStatusBadge = (status) => {
    const statusMap = {
      NEW: { label: "New", color: "bg-yellow-100 text-yellow-600" },
      PENDING: { label: "Pending", color: "bg-orange-100 text-orange-600" },
      DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-600" },
      CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-600" },
    };

    const info = statusMap[status] || {
      label: status,
      color: "bg-gray-100 text-gray-600",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${info.color}`}>
        {info.label}
      </span>
    );
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
  const startIndex = (pagination.currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;

  const paginatedOrders = orders.slice(startIndex, endIndex);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Order Monitoring</h1>

      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b px-6 py-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setPagination((prev) => ({ ...prev, currentPage: 1 }));
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

        {/* Filters */}
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
            onClick={fetchOrders}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Date Range Modal */}
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

        {/* Orders Table */}
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
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Restaurant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Order Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Total Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Delivery Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedOrders.map((order, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-4 font-medium text-sm text-gray-900">
                        #{order.orderId}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {order.customer_name || order.customer || "Guest"}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {order.restaurant_name || "Unknown Restaurant"}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatOrderTime(order.time)}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                        ₹{order.price}
                      </td>

                      <td className="px-4 py-4">
                        {getStatusBadge(order.restaurantStatus?.toUpperCase())}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-600">
                        {order.deliveryPartnerStatus}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={() => navigate(`/orders/${order.orderId}`)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
    </div>
  );
};

export default OrdersList;