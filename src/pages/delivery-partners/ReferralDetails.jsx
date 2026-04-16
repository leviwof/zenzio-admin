import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Phone, Mail } from 'lucide-react';

const ReferralDetails = () => {
  const navigate = useNavigate();
  const { referralId } = useParams();
  const [loading, setLoading] = useState(false);

  // Empty state - Replace with API
  const [referralData, setReferralData] = useState(null);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/delivery-partners')}
          className="flex items-center text-red-500 hover:text-red-700 mb-4"
        >
          <ChevronLeft size={20} />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Partner Details</h1>
        <p className="text-lg text-gray-600">{referralData?.partnerName || 'Partner Name'}</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Referral ID and Status */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">#REF001</h2>
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded text-sm font-medium">
                PENDING BONUS
              </span>
            </div>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>Referral Date: 15 Jun 2023, 14:32</p>
              <p>Referral Code Used: RIDE2023</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Referred New Partner */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Referred New Partner</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Rajesh Kumar</p>
                  <p className="text-xs text-gray-500">Partner ID: DP2023045</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={16} />
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={16} />
                  <span>rajesh@gmail.com</span>
                </div>
                <div className="pt-2 space-y-1 text-sm">
                  <p className="text-gray-600">Registration Date: 15 Jun 2023</p>
                  <p className="text-gray-600">Onboarding Status: Completed</p>
                </div>
                <div className="pt-2 space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Completed 10 Deliveries: Yes
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    First Delivery Date: 20 Jun 2023
                  </p>
                </div>
                <button className="mt-4 text-red-500 hover:text-red-700 text-sm font-medium">
                  View Partner Profile
                </button>
              </div>
            </div>

            {/* Referring Partner */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Referring Partner</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Amit Singh</p>
                  <p className="text-xs text-gray-500">Partner ID: DP2023012</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={16} />
                  <span>+91 98765 12345</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={16} />
                  <span>amit@gmail.com</span>
                </div>
                <div className="pt-2 text-sm text-gray-600">
                  <p>Total Referrals: 5 successful referrals</p>
                </div>
                <button className="mt-4 text-red-500 hover:text-red-700 text-sm font-medium">
                  View Partner Profile
                </button>
              </div>
            </div>
          </div>

          {/* Referral Bonus */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Referral Bonus</h3>
            <div className="space-y-2 text-sm">
              <p>Referrer Bonus Amount: ₹500</p>
              <p>Referred Partner Bonus Amount: ₹200</p>
              <p>Bonus Status: Pending</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                Pay Bonus to Referrer
              </button>
              <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                Pay Bonus to Referred Partner
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                Mark as Disqualified
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                Mark as Paid Manually
              </button>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-900">Referral Submitted</span>
                <span className="text-gray-500">15 Jun 2023, 14:32</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-900">New Partner Registered</span>
                <span className="text-gray-500">15 Jun 2023, 14:45</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-900">New Partner Completed Onboarding</span>
                <span className="text-gray-500">16 Jun 2023, 10:15</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-900">New Partner First Delivery</span>
                <span className="text-gray-500">20 Jun 2023, 13:22</span>
              </div>
            </div>
          </div>

          {/* Contact Buttons */}
          <div className="flex justify-center gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded hover:bg-red-600">
              <Phone size={18} />
              Contact Referred Partner
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded hover:bg-red-600">
              <Phone size={18} />
              Contact Referrer Partner
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralDetails;