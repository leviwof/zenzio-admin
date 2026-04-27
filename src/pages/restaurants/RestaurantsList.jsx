// =============================================
// FILE: src/pages/restaurants/RestaurantsList.jsx
// FIXED: Contact Information properly showing
// =============================================
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Download, AlertCircle, Eye, Power, PowerOff, Loader2, Edit, Trash2 } from "lucide-react";
import { getAllRestaurants, getRestaurantById, toggleRestaurantActive, permanentlyDeleteRestaurant } from "../../services/api";
import { saveAs } from "file-saver";

const RestaurantsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(location.state?.tab || "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);

      console.log('📤 Fetching restaurants...');
      const response = await getAllRestaurants({});

      let basicData = [];
      if (Array.isArray(response.data)) {
        basicData = response.data;
      } else if (response.data?.data) {
        basicData = response.data.data;
      }

      console.log(`✅ Found ${basicData.length} restaurants`);

      const detailedRestaurants = await Promise.all(
        basicData.map(async (basic) => {
          try {
            if (!basic.uid) {
              console.warn('⚠️ Restaurant missing UID:', basic);
              return {
                id: basic.id,
                uid: basic.uid || `NO_UID_${basic.id}`,
                isActive: basic.isActive,
                restaurant_name: '-',
                city: '-',
                email: '-',
                phone: '-',
              };
            }

            const detailResponse = await getRestaurantById(basic.uid);
            console.log('📦 Detail response for', basic.uid, ':', detailResponse);

            const restaurantDetail = detailResponse.data?.data?.restaurant ||
              detailResponse.data?.restaurant ||
              detailResponse.data?.data;

            console.log('🔍 Restaurant detail:', restaurantDetail);

            // 🔥 FIXED: Multiple ways to extract contact info
            let email = '-';
            let phone = '-';

            // Try different possible locations for email
            if (restaurantDetail?.profile?.contact_email) {
              email = restaurantDetail.profile.contact_email;
            } else if (restaurantDetail?.contact?.encryptedEmail) {
              email = restaurantDetail.contact.encryptedEmail;
            } else if (restaurantDetail?.contact?.email) {
              email = restaurantDetail.contact.email;
            } else if (restaurantDetail?.profile?.email) {
              email = restaurantDetail.profile.email;
            } else if (basic.email) {
              email = basic.email;
            }

            // Try different possible locations for phone
            if (restaurantDetail?.profile?.contact_number) {
              phone = restaurantDetail.profile.contact_number;
            } else if (restaurantDetail?.contact?.encryptedPhone) {
              phone = restaurantDetail.contact.encryptedPhone;
            } else if (restaurantDetail?.contact?.phone) {
              phone = restaurantDetail.contact.phone;
            } else if (basic.phoneNumber) {
              phone = basic.phoneNumber;
            }

            console.log('📧 Extracted - Email:', email, 'Phone:', phone);

            return {
              id: basic.id,
              uid: basic.uid,
              isActive: basic.isActive,
              createdAt: basic.createdAt,
              restaurant_name: restaurantDetail?.profile?.restaurant_name || '-',
              city: restaurantDetail?.address?.city || '-',
              email: email,
              phone: phone,
              rating: restaurantDetail?.rating_avg || 0,
            };
          } catch (error) {
            console.error(`❌ Error fetching details for ${basic.uid}:`, error);
            return {
              id: basic.id,
              uid: basic.uid,
              isActive: basic.isActive,
              restaurant_name: '-',
              city: '-',
              email: '-',
              phone: '-',
            };
          }
        })
      );

      console.log('✅ All restaurants loaded:', detailedRestaurants);
      setRestaurants(detailedRestaurants);

    } catch (error) {
      console.error("❌ Error:", error);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRestaurants = () => {
    let filtered = [...restaurants];

    if (activeTab === "active") {
      filtered = filtered.filter(r => r.statusLabel === 'ON');
    } else if (activeTab === "inactive") {
      filtered = filtered.filter(r => r.statusLabel === 'OFF' || r.statusLabel === 'BLOCKED');
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.restaurant_name?.toLowerCase().includes(search) ||
        r.city?.toLowerCase().includes(search) ||
        r.email?.toLowerCase().includes(search)
      );
    }

    return filtered;
  };

  const filteredRestaurants = getFilteredRestaurants();
  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRestaurants = filteredRestaurants.slice(startIndex, startIndex + itemsPerPage);

  const handleToggleActive = async (restaurantId, currentIsActive) => {
    try {
      await toggleRestaurantActive(restaurantId);
      alert(`✅ Restaurant ${currentIsActive ? 'blocked' : 'unblocked'} successfully!`);
      fetchRestaurants();
    } catch (error) {
      console.error("❌ Error:", error);
      alert(`❌ Failed: ${error.message}`);
    }
  };

  const handleDeleteRestaurant = async (uid, name) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY delete restaurant ${name}? This action cannot be undone and will delete their Firebase account too.`)) {
      try {
        await permanentlyDeleteRestaurant(uid);
        alert('✅ Restaurant deleted successfully');
        fetchRestaurants();
      } catch (error) {
        console.error('Error deleting restaurant:', error);
        alert(`❌ Failed: ${error.message}`);
      }
    }
  };

  const handleViewClick = (restaurant) => {
    if (!restaurant.uid || restaurant.uid === 'undefined') {
      alert('❌ Invalid restaurant UID');
      return;
    }
    navigate(`/restaurants/${restaurant.uid}`);
  };

  const handleExport = () => {
    if (!filteredRestaurants.length) {
      alert('No data to export');
      return;
    }

    const csvContent = [
      ["Restaurant Name", "Email", "Phone", "City", "Registration Date", "Status"],
      ...filteredRestaurants.map((r) => [
        r.restaurant_name || '-',
        r.email || '-',
        r.phone || '-',
        r.city || '-',
        r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-',
        r.isActive ? 'Active' : 'Inactive',
      ]),
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `restaurants-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const getStatusBadge = (restaurant) => {
    const statusLabel = restaurant.statusLabel;
    if (statusLabel === 'ON') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
          ON
        </span>
      );
    } else if (statusLabel === 'OFF') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-700">
          OFF
        </span>
      );
    } else if (statusLabel === 'BLOCKED') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">
          BLOCKED
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-700">
        Pending Review
      </span>
    );
  };

  const tabs = [
    { label: "All Restaurants", value: "all" },
    { label: "ON", value: "active" },
    { label: "OFF/BLOCKED", value: "inactive" },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Restaurant Management</h1>
        <button
          onClick={handleExport}
          disabled={filteredRestaurants.length === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <Download size={16} />
          Export
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 py-3">
          <div className="flex items-center space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value);
                  setCurrentPage(1);
                }}
                className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === tab.value
                  ? "text-red-600"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {tab.label}
                {activeTab === tab.value && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Search Bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search restaurants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>

            {searchTerm && (
              <button
                className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRestaurants.length)} of {filteredRestaurants.length} restaurants
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="inline-block animate-spin text-red-600 mb-4" size={40} />
              <p className="text-gray-600">Loading restaurants...</p>
            </div>
          ) : currentRestaurants.length === 0 ? (
            <div className="text-center py-16">
              <AlertCircle className="inline-block text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 text-lg font-medium">No restaurants found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm ? 'Try adjusting your search' : 'No data available'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Restaurant Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contact Information
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        City
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Registration Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Rating
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
                    {currentRestaurants.map((restaurant) => (
                      <tr key={restaurant.uid} className="hover:bg-gray-50 transition-colors">
                        {/* Restaurant Name */}
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900 text-sm">
                            {restaurant.restaurant_name}
                          </div>
                        </td>

                        {/* Contact Information */}
                        <td className="px-4 py-4">
                          {/* 🔥 FIXED: Show email and phone properly */}
                          <div className="text-sm text-gray-600">
                            {restaurant.email && restaurant.email !== '-' ? restaurant.email : 'No email'}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {restaurant.phone && restaurant.phone !== '-' ? restaurant.phone : 'No phone'}
                          </div>
                        </td>

                        {/* City */}
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-600">
                            {restaurant.city}
                          </div>
                        </td>

                        {/* Registration Date */}
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-600">
                            {restaurant.createdAt
                              ? new Date(restaurant.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })
                              : '-'}
                          </div>
                        </td>

                        {/* Rating */}
                        <td className="px-4 py-4">
                          {restaurant.rating > 0 ? (
                            <div className="flex items-center text-yellow-500">
                              {/* Using a simple unicode star or import Star from lucide-react if available. 
                                   Start icon is imported at top line 7. */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                              <span className="ml-1 text-sm font-medium">{Number(restaurant.rating).toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No Rating</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          {getStatusBadge(restaurant)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {/* View Details Button */}
                            <button
                              onClick={() => handleViewClick(restaurant)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              View Details
                            </button>

                            {/* Block/Unblock Button - Admin only toggles isActive */}
                            <button
                              onClick={() => handleToggleActive(restaurant.uid, restaurant.isActive)}
                              className={`text-sm font-medium ${
                                restaurant.statusLabel === 'BLOCKED'
                                  ? 'text-green-600 hover:text-green-700'
                                  : 'text-red-600 hover:text-red-700'
                              }`}
                            >
                              {restaurant.statusLabel === 'BLOCKED' ? 'Unblock' : 'Block'}
                            </button>

                            <button
                              onClick={() => handleDeleteRestaurant(restaurant.uid, restaurant.restaurant_name)}
                              className="text-red-500 hover:text-red-700 transition p-1"
                              title="Permanently Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 text-sm rounded ${currentPage === pageNum
                            ? "bg-red-600 text-white font-medium"
                            : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantsList;
