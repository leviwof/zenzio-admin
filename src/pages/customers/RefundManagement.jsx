import React, { useState, useEffect } from 'react';
import { Search, Calendar, Eye } from 'lucide-react';

const RefundManagement = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [refundIdFilter, setRefundIdFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Empty state - Replace with API call
  useEffect(() => {
    // fetchRefunds();
  }, []);

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch = refund.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         refund.refundId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRefundId = !refundIdFilter || refund.refundId === refundIdFilter;
    return matchesSearch && matchesRefundId;
  });

  const getStatusBadge = (status) => {
    const badges = {
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Approved': 'bg-green-100 text-green-700',
      'Rejected': 'bg-red-100 text-red-700',
      'Escalated': 'bg-yellow-100 text-yellow-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const handleProcess = (refundId) => {
    console.log('Processing refund:', refundId);
    // Add API call here
  };

  const handleMarkAsReviewed = (refundId) => {
    console.log('Marking as reviewed:', refundId);
    // Add API call here
  };

  return (
    <div className="p-6 space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search refunds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <select
          value={refundIdFilter}
          onChange={(e) => setRefundIdFilter(e.target.value)}
          className="px-4 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
        >
          <option value="">Refund ID</option>
          <option value="REF-2023001">REF-2023001</option>
          <option value="REF-2023002">REF-2023002</option>
          <option value="REF-2023003">REF-2023003</option>
        </select>

        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-sm focus:outline-none"
          />
          <span className="text-gray-400">to</span>
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-sm focus:outline-none"
          />
        </div>

        <button className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600">
          Apply Filters
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      ) : filteredRefunds.length === 0 ? (
        <div className="text-center py-12">
          <Search className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 text-sm">No refund requests found</p>
          <p className="text-xs text-gray-400 mt-2">Refund requests will appear here</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRefunds.map((refund) => (
                  <tr key={refund.refundId} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{refund.refundId}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{refund.orderId}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{refund.customerName}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{refund.restaurantName}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">${refund.amount}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">{refund.reason}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{refund.requestDate}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded ${getStatusBadge(refund.status)}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button className="text-red-500 hover:text-red-700 text-xs">
                          View Details
                        </button>
                        {refund.status === 'Pending' && (
                          <button
                            onClick={() => handleProcess(refund.refundId)}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                          >
                            Process
                          </button>
                        )}
                        {refund.status === 'Escalated' && (
                          <button
                            onClick={() => handleMarkAsReviewed(refund.refundId)}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                          >
                            Mark as Reviewed
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing 1 to 7 of {filteredRefunds.length} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                &lt;
              </button>
              {[1, 2, 3, 4, 5].map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded ${
                    currentPage === page
                      ? 'bg-red-500 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                &gt;
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RefundManagement;