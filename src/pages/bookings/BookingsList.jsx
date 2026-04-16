// =============================================
// FILE: src/pages/bookings/BookingsList.jsx
// VIEW ONLY - No Modify/Cancel buttons
// =============================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar } from 'lucide-react';
import { getAllBookings } from '../../services/api';

const BookingsList = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [showDateRange, setShowDateRange] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);

      const params = {
        status: activeTab !== 'All' ? activeTab : undefined,
        search: searchText || undefined,
        page,
        pageSize: 10,
        date: startDate && endDate ? `${startDate},${endDate}` : undefined,
      };

      const response = await getAllBookings(params);
      const data = response.data; // Backend returns { bookings, total, pages } directly

      setBookings(data.bookings || []);
      setTotalPages(data.pages || 1);
      setTotalResults(data.total || 0);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab, page]);

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchBookings();
    }
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = status ? status.toUpperCase() : '';
    const statusMap = {
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      SEATED: 'bg-purple-100 text-purple-800',
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${statusMap[normalizedStatus] || 'bg-gray-100 text-gray-800'
          }`}
      >
        {status}
      </span>
    );
  };

  const tabs = [
    { label: 'All Bookings', value: 'All' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const applyDateRange = () => {
    setPage(1);
    fetchBookings();
    setShowDateRange(false);
  };

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetchBookings();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Booking Management</h1>

      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b px-6 py-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full font-medium text-sm transition ${activeTab === tab.value
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search by Booking ID, Customer Name or Restaurant"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              onClick={() => setShowDateRange(!showDateRange)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <Calendar size={16} />
              <span>Date Range</span>
            </button>

            <button
              onClick={() => setShowFilter(!showFilter)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <Filter size={16} />
              <span>Filter</span>
            </button>
          </div>

          {/* Date Range Picker */}
          {showDateRange && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg flex items-center gap-4">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                onClick={applyDateRange}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                Apply
              </button>
              <button
                onClick={clearDateRange}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
              >
                Clear
              </button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
              <p className="mt-4 text-gray-600">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No bookings found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Booking ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Customer Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Restaurant Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Guests
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-4 font-medium text-sm text-gray-900">
                          #{b.bookingId}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">{b.customerName}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">{b.restaurantName}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{b.dateTime}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{b.guests} guests</td>
                        <td className="px-4 py-4">{getStatusBadge(b.status)}</td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => navigate(`/bookings/${b.id}`)}
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
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalResults)} of{' '}
                  {totalResults} results
                </p>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    ←
                  </button>
                  {[...Array(Math.min(totalPages, 5))].map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1 rounded text-sm ${page === pageNum ? 'bg-red-500 text-white' : 'border hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-2 py-1">...</span>}
                  {totalPages > 5 && (
                    <button
                      onClick={() => setPage(totalPages)}
                      className={`px-3 py-1 rounded text-sm ${page === totalPages ? 'bg-red-500 text-white' : 'border hover:bg-gray-50'
                        }`}
                    >
                      {totalPages}
                    </button>
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
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
    </div>
  );
};

export default BookingsList;