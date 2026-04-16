import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Star, Edit, AlertCircle, Trash2, Clock } from 'lucide-react';
import { getAllDeliveryPartners, updatePartnerStatus, permanentlyDeletePartner } from '../../services/api';
import { saveAs } from 'file-saver';
import ReferralManagement from './ReferralManagement';

const DeliveryPartnersList = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // Main tab
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [pagination, setPagination] = useState({
    totalPartners: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10
  });

  useEffect(() => {
    if (activeTab === 'info') {
      const delay = setTimeout(() => {
        setCurrentPage(1);
        fetchPartners();
      }, 400);

      return () => clearTimeout(delay);
    }
  }, [searchTerm, activeFilter, vehicleFilter, statusFilter, currentPage, activeTab]);



  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 3000);
  };

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: activeFilter !== 'All' ? activeFilter : statusFilter !== 'All' ? statusFilter : undefined,
        vehicleType: vehicleFilter !== 'All' ? vehicleFilter : undefined,
      };

      const response = await getAllDeliveryPartners(params);

      const backendData = response?.data?.data || [];
      const paginationData = response?.data?.pagination;

      const transformedPartners = backendData.map((p) => ({
        id: p.id,
        fleetUid: p.uid,
        name: p.profile ? `${p.profile.first_name || ''} ${p.profile.last_name || ''}`.trim() : '-',
        email: p.contact?.contactEmail || p.contact?.encryptedEmail || '-',
        phone: p.contact?.contactPhone || p.contact?.encryptedPhone || '-',
        vehicleType: p.documents?.length > 0 ? p.documents[0].vehicle_type || 'N/A' : 'N/A',
        registrationDate: new Date(p.createdAt).toLocaleDateString('en-GB'),
        rating: p.rating_avg ? parseFloat(p.rating_avg).toFixed(1) : 'No Rating',
        status: p.status ? (p.isActive ? 'on-duty' : 'active') : (p.status_flag === 'Blocked' ? 'blocked' : 'inactive'),
      }));

      setPartners(transformedPartners);
      setPagination(paginationData);
    } catch (error) {
      console.error(error);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };


  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      fetchPartners();
    }
  };

  const handleStatusChange = async (partnerId, currentStatus,) => {
    try {
      let newStatus;

      switch (currentStatus.toLowerCase()) {
        case 'pending':
          newStatus = 'active';
          break;
        case 'active':
          newStatus = 'blocked';
          break;
        case 'blocked':
          newStatus = 'active';
          break;
        case 'inactive':
          newStatus = 'active';
          break;
        default:
          newStatus = 'inactive';
          break;
      }
      await updatePartnerStatus(partnerId, newStatus);
      fetchPartners();
    } catch (error) {
      console.error('Error updating status:', error);
      showAlert('error', error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeletePartner = async (uid, name) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY delete partner ${name}? This action cannot be undone and will delete their Firebase account too.`)) {
      try {
        await permanentlyDeletePartner(uid);
        showAlert('success', 'Partner deleted successfully');
        fetchPartners();
      } catch (error) {
        console.error('Error deleting partner:', error);
        showAlert('error', error.response?.data?.message || 'Failed to delete partner');
      }
    }
  };




  const exportCSV = () => {
    if (partners.length === 0) {
      showAlert('error', 'No data to export');
      return;
    }
    const headers = ['Name', 'Email', 'Phone', 'Vehicle', 'Status', 'Rating', 'Registration Date'];
    const rows = partners.map((p) => [
      p.name,
      p.email,
      p.phone,
      p.vehicleType,
      p.status,
      p.rating,
      p.registrationDate
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'delivery-partners.csv');
    showAlert('success', 'Data exported successfully!');
  };

  const mainTabs = [
    { label: 'Delivery Partner Info', value: 'info' },
    { label: 'Referral', value: 'referral', isUpcoming: true }
  ];

  const filterTabs = [
    { label: 'All Partners', value: 'All', color: 'bg-gray-50 text-gray-600' },
    { label: 'Pending Approval', value: 'pending', color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Active Partners', value: 'active', color: 'bg-green-50 text-green-600' },
    { label: 'On-Duty', value: 'on-duty', color: 'bg-blue-50 text-blue-600' },
    { label: 'Inactive Partners', value: 'inactive', color: 'bg-gray-50 text-gray-600' }
  ];

  const getVehicleIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'bike':
        return '🏍️';
      case 'scooter':
        return '🛵';
      case 'cycle':
        return '🚴';
      default:
        return '🚗';
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
      inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
      blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800' },
      'on-duty': { label: 'On-Duty', color: 'bg-blue-100 text-blue-800' }
    };
    const info = statusMap[status?.toLowerCase()] || statusMap.inactive;
    return (
      <span className={`px-3 py-1 rounded text-xs font-medium ${info.color}`}>{info.label}</span>
    );
  };

  const getActionButton = (partner) => {
    const status = partner?.status?.toLowerCase();

    if (status === 'active' || status === 'on-duty') {
      return (
        <button
          onClick={() => handleStatusChange(partner.id, partner.status)}
          className="px-3 py-1 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition"
        >
          Block
        </button>
      );
    }

    if (status === 'inactive' || status === 'blocked' || status === 'pending') {
      return (
        <button
          onClick={() => handleStatusChange(partner.id, partner.status)}
          className="px-3 py-1 rounded text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition"
        >
          Approve/Unblock
        </button>
      );
    }

    return null;
  };


  return (
    <div className="p-6">
      {/* Alert Notification */}
      {alert.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${alert.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
          <AlertCircle size={20} />
          <span className="font-medium">{alert.message}</span>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6">Delivery Partner Management</h1>

      <div className="bg-white rounded-lg shadow">
        {/* Main Tabs */}
        <div className="border-b px-6 py-4 flex items-center space-x-2">
          {mainTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => !tab.isUpcoming && setActiveTab(tab.value)}
              disabled={tab.isUpcoming}
              className={`px-4 py-2 font-medium flex items-center space-x-2 transition ${activeTab === tab.value
                ? 'text-red-500 border-b-2 border-red-500'
                : tab.isUpcoming
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <span>{tab.label}</span>
              {tab.isUpcoming && (
                <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-red-500/20">
                  Soon
                </span>
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center">
            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' ? (
          <div className="p-6">
            {/* Filter Tabs */}
            <div className="flex space-x-2 mb-6 text-sm">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveFilter(tab.value);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full font-medium transition ${activeFilter === tab.value
                    ? tab.color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {tab.label}
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-white text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search + Filters */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search by name or ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearch}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <select
                value={vehicleFilter}
                onChange={(e) => {
                  setVehicleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="All">Vehicle Type: All</option>
                <option value="Bike">Bike</option>
                <option value="Scooter">Scooter</option>
                <option value="Cycle">Cycle</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="All">Status: All status...</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
              </select>
              <button
                onClick={exportCSV}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2 transition"
              >
                <Download size={16} />
                <span>Export Data</span>
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No delivery partners found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Partner Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Vehicle Type
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Registration Date
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Rating
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {partners.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-4 font-medium text-gray-900">{p.name}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            <div>{p.email}</div>
                            <div>{p.phone}</div>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className="mr-1">{getVehicleIcon(p.vehicleType)}</span>
                            {p.vehicleType}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">{p.registrationDate}</td>
                          <td className="px-4 py-4">
                            {p.rating !== 'No Rating' ? (
                              <div className="flex items-center text-yellow-500">
                                <Star size={16} fill="currentColor" />
                                <span className="ml-1 text-sm font-medium">{p.rating}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No Rating</span>
                            )}
                          </td>
                          <td className="px-4 py-4">{getStatusBadge(p.status)}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => navigate(`/delivery-partners/${p.fleetUid}`)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium transition"
                              >
                                View Details
                              </button>

                              {getActionButton(p)}
                              <button
                                onClick={() => navigate(`/delivery-partners/${p.fleetUid}/attendance`)}
                                className="text-blue-500 hover:text-blue-700 transition p-1"
                                title="View Attendance Log"
                              >
                                <Clock size={18} />
                              </button>
                              <button
                                onClick={() => handleDeletePartner(p.fleetUid, p.name)}
                                className="text-red-600 hover:text-red-800 transition p-1"
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
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    1-10 of {pagination.totalPartners} partners
                  </p>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      &lt;
                    </button>

                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 border rounded transition ${currentPage === page
                          ? 'bg-red-500 text-white border-red-500'
                          : 'hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    ))}

                    {pagination.totalPages > 5 && <span className="px-2">...</span>}

                    {pagination.totalPages > 5 && (
                      <button
                        onClick={() => setCurrentPage(pagination.totalPages)}
                        className={`px-3 py-1 border rounded transition ${currentPage === pagination.totalPages
                          ? 'bg-red-500 text-white border-red-500'
                          : 'hover:bg-gray-50'
                          }`}
                      >
                        {pagination.totalPages}
                      </button>
                    )}

                    <select className="px-2 py-1 border rounded text-sm">
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                    </select>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          // Referral Tab
          <ReferralManagement />
        )}
      </div>
    </div>
  );
};

export default DeliveryPartnersList;
