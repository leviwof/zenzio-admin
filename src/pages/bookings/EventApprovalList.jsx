




import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getPendingEvents, getAllEvents } from '../../services/api';

const EventApprovalList = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('Pending Review');

  
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchText || undefined,
        page,
        pageSize: 10,
      };

      let response;

      if (activeTab === 'Pending Review') {
        response = await getPendingEvents(params);
      } else if (activeTab === 'Approved') {
        params.status = 'Approved';
        response = await getAllEvents(params);
      } else if (activeTab === 'Rejected') {
        params.status = 'Rejected';
        response = await getAllEvents(params);
      } else {
        response = await getAllEvents(params);
      }

      const data = response.data.data;
      setEvents(data.events || []);
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeTab, page]);

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchEvents();
    }
  };

  const handleViewDetails = (id) => {
    navigate(`/events/approval/${id}`);
  };

  const handleReject = (id) => {
    navigate(`/events/approval/${id}`);
  };

  const getEventStatus = (event) => {
    if (activeTab === 'Pending Review') {
      return 'Awaiting Review';
    }
    if (event.isVerified) {
      return 'Approved';
    } else if (event.isActive === false) {
      return 'Rejected';
    }
    return 'Pending';
  };

  const formatEventForDisplay = (event) => {
    if (event.requestId) {
      return event;
    }
    return {
      id: event.id,
      requestId: `#REQ-${event.id.substring(0, 5)}`,
      restaurantName: event.restaurantName || 'N/A',
      dateSubmitted: event.createdAt,
      status: event.isVerified && event.status === "APPROVED" ?  'Approved' : event.status === "EXPIRED" ? "Expired" : (event.isActive === false ? 'Rejected' : 'Pending'),
    };
  };

  const tabs = [
    { label: 'Pending Review', value: 'Pending Review' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'All Events', value: 'All' },
  ];

  const getStatusBadge = (status) => {
    if (status === 'Approved') {
      return 'bg-green-100 text-green-800';
    } else if (status === 'Rejected') {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dining Approval</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dining/add')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center gap-2 text-sm"
          >
            <span className="text-lg">+</span>
            Add Dining Space
          </button>
          <button
            onClick={() => navigate('/events/add')}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-md flex items-center gap-2 text-sm"
          >
            <span className="text-lg">+</span>
            Add Event
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
                {activeTab === tab.value && totalCount > 0 && (
                  <span className="ml-2 bg-white text-red-500 px-2 py-0.5 rounded-full text-xs">
                    {totalCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {}
          <div className="relative w-96">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Search by Restaurant Name, Request ID, Content Type..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
              <p className="mt-4 text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No events found for {activeTab}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Request ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Restaurant Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date Submitted</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {events.map((event) => {
                      const formattedEvent = formatEventForDisplay(event);
                      return (
                        <tr key={formattedEvent.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-4 font-medium text-sm text-gray-900">
                            {formattedEvent.requestId}
                          </td>
                          <td className="px-4 py-4 text-sm text-red-600 font-medium">
                            {formattedEvent.restaurantName}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {new Date(formattedEvent.dateSubmitted).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                                formattedEvent.status
                              )}`}
                            >
                              {formattedEvent.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              {activeTab === 'Pending Review' ? (
                                <>
                                  <button
                                    onClick={() => handleViewDetails(formattedEvent.id)}
                                    className="px-4 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                  >
                                    Review & Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(formattedEvent.id)}
                                    className="px-4 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleViewDetails(formattedEvent.id)}
                                  className="px-4 py-1 text-red-500 hover:text-red-700 text-xs font-medium"
                                >
                                  View Details
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {}
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalCount)} of {totalCount} results
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 px-3 py-1">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Next
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

export default EventApprovalList;
