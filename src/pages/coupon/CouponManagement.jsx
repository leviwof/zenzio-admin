import React, { useEffect, useState } from 'react';
import { Search, Edit2, Trash2, UserMinus, Download } from 'lucide-react';
import CreateCouponPage from "./CreateCouponModal";
import { getAllCoupons, createCoupon, updateCoupon, deleteCoupon, downloadCouponReport } from '../../services/api';
import toast from 'react-hot-toast';

const CouponManagement = () => {
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [usedCoupons, setUsedCoupons] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });

  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'All') params.status = filters.status;

      const response = await getAllCoupons(params);
      // Assuming response.data is the array or response.data.data
      const data = response.data || [];
      setCoupons(data);

      // Calculate stats
      const active = data.filter(c => c.status === 'Active').length;
      setActiveCount(active);
      setInactiveCount(data.length - active);
      // Total cost logic might need adjustment based on real data usage, simpler for now
      // setTotalCost... 
    } catch (error) {
      console.error("Failed to fetch coupons", error);
      toast.error("Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchCoupons();
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveCoupon = async (couponData) => {
    try {
      if (selectedCoupon) {
        await updateCoupon(selectedCoupon.id, couponData);
        toast.success("Coupon updated successfully");
      } else {
        await createCoupon(couponData);
        toast.success("Coupon created successfully");
      }
      fetchCoupons(); // Refresh list
      setShowCreatePage(false);
      setSelectedCoupon(null);
    } catch (error) {
      console.error("Failed to save coupon", error);
      toast.error("Failed to save coupon");
    }
  };

  const handleEdit = (coupon) => {
    setSelectedCoupon(coupon);
    setShowCreatePage(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await deleteCoupon(id);
      toast.success("Coupon deleted");
      fetchCoupons();
    } catch (error) {
      console.error("Failed to delete coupon", error);
      toast.error("Failed to delete coupon");
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const newStatus = coupon.status === 'Active' ? 'Inactive' : 'Active';
      await updateCoupon(coupon.id, { status: newStatus });
      toast.success(`Coupon ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
      fetchCoupons();
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status");
    }
  };

  const usageData = [];

  const handleDownloadReport = async () => {
    try {
      const response = await downloadCouponReport();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'coupons_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Failed to download report", error);
      toast.error("Failed to download report");
    }
  };

  // Removed local state update logic in favor of API refresh
  // const handleSaveCoupon... replaced above

  // Show create page if enabled
  if (showCreatePage) {
    return (
      <CreateCouponPage
        onClose={() => {
          setShowCreatePage(false);
          setSelectedCoupon(null);
        }}
        onSave={handleSaveCoupon}
        initialData={selectedCoupon}
      />
    );
  }

  // Main coupon management page
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50 flex items-center gap-2"
          >
            <Download size={16} />
            Download Report
          </button>
          <button
            onClick={() => setShowCreatePage(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Create New Coupon
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Active Coupons Count</div>
          <div className="text-3xl font-bold text-red-500">{activeCount}</div>
          <div className="text-sm text-green-600 mt-1">-</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Inactive Coupons Count</div>
          <div className="text-3xl font-bold text-gray-900">{inactiveCount}</div>
          <div className="text-sm text-green-600 mt-1">-</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Total Cost of Coupon Code</div>
          <div className="text-3xl font-bold text-green-500">₹{totalCost}</div>
          <div className="text-sm text-green-600 mt-1">-</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Current Used Coupons</div>
          <div className="text-3xl font-bold text-gray-900">{usedCoupons}</div>
          <div className="text-sm text-green-600 mt-1">-</div>
        </div>
      </div>

      {/* Created Coupon Codes */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Created Coupon Codes</h2>
        </div>
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by Coupon Code or Name"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-md"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Status: All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                <th className="pb-3 font-medium">CODE</th>
                <th className="pb-3 font-medium">NAME</th>
                <th className="pb-3 font-medium">DISCOUNT VALUE</th>
                <th className="pb-3 font-medium">VALID UNTIL</th>
                <th className="pb-3 font-medium">REDEMPTIONS</th>
                <th className="pb-3 font-medium">STATUS</th>
                <th className="pb-3 font-medium">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">
                    No coupons created yet. Click "Create New Coupon" to get started.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-4 text-sm">{coupon.code}</td>
                    <td className="py-4 text-sm">{coupon.name}</td>
                    <td className="py-4 text-sm">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}% OFF`
                        : `₹${coupon.discountValue} Flat`}
                    </td>
                    <td className="py-4 text-sm">{coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-4 text-sm">
                      {coupon.redemptionCount || 0} / {coupon.usageLimit || '∞'}
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${coupon.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {coupon.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={coupon.status === 'Active'}
                            onChange={() => handleToggleStatus(coupon)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="text-gray-600 hover:text-red-500"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="text-gray-600 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current Coupon Usage & Holders */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Current Coupon Usage & Holders</h2>
        </div>
        <div className="p-5">
          <div className="relative w-80 mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by Coupon Code or Name"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                <th className="pb-3 font-medium">USER NAME</th>
                <th className="pb-3 font-medium">COUPON CODE</th>
                <th className="pb-3 font-medium">LAST USED DATE</th>
                <th className="pb-3 font-medium">TOTAL SAVINGS</th>
                <th className="pb-3 font-medium">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {usageData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">
                    No coupon usage data available.
                  </td>
                </tr>
              ) : (
                usageData.map((usage, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-4 text-sm text-red-500">{usage.user}</td>
                    <td className="py-4 text-sm text-red-500">{usage.code}</td>
                    <td className="py-4 text-sm">{usage.lastUsed}</td>
                    <td className="py-4 text-sm">{usage.savings}</td>
                    <td className="py-4">
                      <button className="text-red-500 hover:text-red-600">
                        <UserMinus size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CouponManagement;