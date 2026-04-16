import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download } from "lucide-react";
import {
  getAllCustomers,
  updateCustomerStatus,
  getCustomerById,
} from "../../services/api";
import { saveAs } from "file-saver";
import RefundManagement from "./RefundManagement";


const mapUserToCustomer = (user) => {
  const fullName = `${user.profile?.first_name || ""} ${user.profile?.last_name || ""
    }`.trim();

  return {
    id: user.id,
    customerId: user.uid,
    name: fullName || "N/A",
    email: user.contact?.encryptedEmail || user.contact?.email || "N/A",
    mobile: user.contact?.encryptedPhone || user.contact?.phone || "N/A",
    createdAt: user.createdAt,
    isActive: user.isActive, // IMPORTANT
    status: user.isActive ? "active" : "blocked",
  };
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
      "Name",
      "UID",
      "Email",
      "Mobile",
      "Status",
      "Availability",
      "Created At",
    ].join(",");

    const csvRows = detailed.filter(Boolean).map((c) => {
      const customer = normalizeCustomer(c);

      return [
        customer.name,
        customer.uid,
        customer.email,
        customer.mobile,
        customer.status,
        customer.isActive,
        customer.createdAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [csvHeader, ...csvRows].join("\n");

    saveAs(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `customers-${Date.now()}.csv`
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6">User Management</h1>

      <div className="bg-white rounded-lg shadow-sm">
        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-3 transition ${activeTab === "users"
                ? "text-red-500 border-b-2 border-red-500 font-medium"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              User Information
            </button>
            <button
              disabled={true}
              className="px-4 py-3 text-gray-400 cursor-not-allowed flex items-center gap-2"
            >
              <span>Refund</span>
              <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-red-500/20">
                Soon
              </span>
            </button>
          </div>
        </div>

        {activeTab === "users" ? (
          <div className="p-6 space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Search users"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border pr-4 py-2 rounded  border-gray-300 "
              >
                <option>All</option>
                <option>Active</option>
                <option>Blocked</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border pr-4 py-2 rounded  border-gray-300 "
              >
                <option value="">Sort By</option>
                <option value="createdAt_asc">Date ↑</option>
                <option value="createdAt_desc">Date ↓</option>
                <option value="name_asc">Name A–Z</option>
                <option value="name_desc">Name Z–A</option>
              </select>

              <button
                onClick={handleExport}
                className="border px-4 py-2 rounded flex items-center gap-2"
              >
                <Download size={16} /> Export
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-10">Loading...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Joined Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Customer Name & ID */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900 text-sm">
                          {c.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.customerId}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          {c.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.mobile}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="">
                        <div className="text-sm text-gray-600">
                          {c.status ? "Block" : "Unblock"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="">
                        <div className="flex items-center gap-2">
                          {/* View Details Button */}
                          <button
                            onClick={() =>
                              navigate(`/customers/${c.customerId}`)
                            }
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            View Details
                          </button>

                          {/* Block/Unblock Button */}
                          <button
                            onClick={() => handleStatusToggle(c)}
                            className={`text-sm font-medium ${c.isActive
                              ? "text-red-600 hover:text-red-700"
                              : "text-green-600 hover:text-green-700"
                              }`}
                          >
                            {c.isActive ? "Block" : "Unblock"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center pt-4">
              <p className="text-sm">
                Showing {(currentPage - 1) * pagination.limit + 1}–
                {Math.min(currentPage * pagination.limit, pagination.total)} of{" "}
                {pagination.total}
              </p>

              <div className="flex gap-2">
                {Array.from(
                  { length: pagination.totalPages },
                  (_, i) => i + 1
                ).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 text-sm rounded ${currentPage === p
                      ? "bg-red-600 text-white font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <select
                value={pagination.limit}
                onChange={(e) =>
                  setPagination((p) => ({
                    ...p,
                    limit: Number(e.target.value),
                  }))
                }
                className="border px-2 py-1 rounded"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
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
