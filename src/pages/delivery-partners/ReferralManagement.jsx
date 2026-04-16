import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download } from 'lucide-react';

const ReferralManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Empty state - Replace with API
  const [referrals, setReferrals] = useState([]);

  const tabs = [
    { id: 'all', label: 'All Referrals' },
    { id: 'pending', label: 'Pending Bonus' },
    { id: 'paid', label: 'Bonus Paid' },
    { id: 'disqualified', label: 'Disqualified' },
  ];

  const getStatusBadge = (status) => {
    const badges = {
      'Pending Payment': 'bg-yellow-100 text-yellow-700',
      'Paid': 'bg-green-100 text-green-700',
      'Disqualified': 'bg-red-100 text-red-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getQualificationBadge = (status) => {
    const badges = {
      'Eligible': 'bg-green-100 text-green-700',
      'Not Yet Qualified': 'bg-gray-100 text-gray-700',
      'Disqualified': 'bg-red-100 text-red-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === tab.id
                ? 'bg-red-100 text-red-600'
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

      {/* Search and Export */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <select className="px-4 py-2 text-sm border border-gray-300 rounded bg-white">
          <option>Vehicle Type: All</option>
          <option>Bike</option>
          <option>Scooter</option>
          <option>Cycle</option>
        </select>
        <select className="px-4 py-2 text-sm border border-gray-300 rounded bg-white">
          <option>Status: All status...</option>
          <option>Eligible</option>
          <option>Not Yet Qualified</option>
          <option>Disqualified</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50">
          <Download size={16} />
          Export Data
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-center py-12">
          <Search className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 text-sm">No referrals found</p>
          <p className="text-xs text-gray-400 mt-2">Referral data will appear here</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referred Partner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrer Partner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qualification Stat...</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonus Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{referral.referralId}</td>
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-gray-900">{referral.referredPartner}</div>
                      <div className="text-gray-500 text-xs">{referral.referredId}</div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-gray-900">{referral.referrerPartner}</div>
                      <div className="text-gray-500 text-xs">{referral.referrerId}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{referral.referralDate}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{referral.referralCode}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getQualificationBadge(referral.qualificationStatus)}`}>
                        {referral.qualificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadge(referral.bonusStatus)}`}>
                        {referral.bonusStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/delivery-partners/referral/${referral.id}`)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          View Details
                        </button>
                        {referral.bonusStatus === 'Pending Payment' && (
                          <button className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                            Process Bonus
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
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-gray-600">
              Showing 1-8 of {referrals.length} referrals
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                &lt;
              </button>
              {[1, 2, 3, 4, 5].map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded ${currentPage === page
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

export default ReferralManagement;