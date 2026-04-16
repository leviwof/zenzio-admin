import React, { useState, useEffect } from 'react';
import { Download, Edit2, Trash2 } from 'lucide-react';
import CreatePlanPage from './CreatePlanPage';
import {
  getAllSubscriptions,
  getSubscriptionStats,
  getSubscriptionHistory,
  createPlan
} from '../../services/api';

const SubscriptionManagement = () => {
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [autoGenCount, setAutoGenCount] = useState(0);
  const [renewalAlert, setRenewalAlert] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subsRes, statsRes] = await Promise.all([
        getAllSubscriptions(),
        getSubscriptionStats()
      ]);

      // Transform backend data to frontend format
      const activeSubs = subsRes.data || [];
      const transformedSubs = activeSubs.map(sub => ({
        id: sub.restaurant_id,
        name: sub.restaurant?.profile?.name || 'Restaurant',
        plan: sub.plan?.name || 'N/A',
        email: sub.restaurant?.contact?.email || 'N/A',
        nextDue: new Date(sub.endDate).toLocaleDateString(),
        status: sub.status,
        paymentStatus: 'Paid', // Assuming active means paid for now
        date: new Date(sub.startDate).toLocaleDateString(),
        fullData: sub
      }));

      setSubscriptions(transformedSubs);

      if (statsRes.data) {
        setAutoGenCount(statsRes.data.totalSubscriptions || 0);
        setRenewalAlert(statsRes.data.revenue || 0); // Using revenue as placeholder for value
        setPendingPayments(statsRes.data.activeSubscriptions || 0);
      }
    } catch (error) {
      console.error('Error fetching subscription data', error);
    }
  };

  const handleSavePlan = async (planData) => {
    try {
      // Convert duration string to days
      const durationMap = {
        '1 Week': 7,
        '1 Month': 30,
        '3 Months': 90,
        '6 Months': 180,
        '1 Year': 365
      };

      const payload = {
        name: planData.name,
        description: planData.description,
        price: parseFloat(planData.price) || 0,
        durationInDays: durationMap[planData.duration] || 30,
        isActive: true
      };

      await createPlan(payload);
      setShowCreatePage(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error creating plan:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to create plan';
      alert(`Error: ${msg}`);
    }
  };

  const handleViewHistory = async (sub) => {
    setSelectedRestaurant(sub);
    setShowPaymentHistory(true);
    try {
      const res = await getSubscriptionHistory(sub.id);
      const history = res.data.map(invoice => ({
        id: invoice.transactionId || invoice.id.substring(0, 8),
        plan: invoice.subscription?.plan?.name || 'Plan',
        amount: `₹${invoice.amount}`,
        date: new Date(invoice.created_at).toLocaleDateString(),
        nextRenewal: '-', // Calculate based on plan duration if needed
        status: invoice.status === 'PAID' ? 'Success' : invoice.status === 'FAILED' ? 'Failed' : 'Pending'
      }));
      setPayments(history);
    } catch (error) {
      console.error("Error fetching history", error);
      setPayments([]);
    }
  };

  // Show create plan page
  if (showCreatePage) {
    return (
      <CreatePlanPage
        onClose={() => setShowCreatePage(false)}
        onSave={handleSavePlan}
      />
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {!showPaymentHistory ? (
        <>
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
            <div className="flex gap-3">
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Create Ledger</button>
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Import</button>
              <button
                onClick={() => setShowCreatePage(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Create New
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Total Subscriptions</div>
              <div className="text-3xl font-bold text-red-500">{autoGenCount}</div>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Total Revenue</div>
              <div className="text-3xl font-bold text-red-500">₹{renewalAlert}</div>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Active Subscriptions</div>
              <div className="text-3xl font-bold text-red-500">{pendingPayments}</div>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                    <th className="pb-3 font-medium">CUSTOMER NAME</th>
                    <th className="pb-3 font-medium">PLAN</th>
                    <th className="pb-3 font-medium">EMAIL</th>
                    <th className="pb-3 font-medium">NEXT DUE</th>
                    <th className="pb-3 font-medium">STATUS</th>
                    <th className="pb-3 font-medium">PAYMENT STATUS</th>
                    <th className="pb-3 font-medium">SUBSCRIPTION DATE</th>
                    <th className="pb-3 font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-gray-500">
                        No subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-4 text-sm text-red-500 cursor-pointer hover:underline" onClick={() => handleViewHistory(sub)}>{sub.name}</td>
                        <td className="py-4 text-sm">{sub.plan}</td>
                        <td className="py-4 text-sm">{sub.email}</td>
                        <td className="py-4 text-sm">{sub.nextDue}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
                            {sub.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 text-sm">{sub.date}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <button className="text-blue-500 hover:text-blue-600">
                              <Edit2 size={18} />
                            </button>
                            <button className="text-red-500 hover:text-red-600">
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
        </>
      ) : (
        // Payment History View
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setShowPaymentHistory(false)} className="text-blue-500 hover:text-blue-600">←</button>
                <h2 className="text-lg font-semibold text-gray-900">Subscription Payment History</h2>
              </div>
              <div className="text-sm text-gray-600">for {selectedRestaurant?.name || 'Restaurant'}</div>
            </div>
            <button className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2">
              <Download size={16} />
              Download Report
            </button>
          </div>

          <div className="p-5">
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-2 block">Date Range</label>
              <select className="px-4 py-2 border border-gray-300 rounded-md">
                <option>Last 6 Months</option>
                <option>Last 3 Months</option>
                <option>Last Year</option>
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Current Active Plan</div>
                  <div className="font-semibold">{selectedRestaurant?.plan || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div className="font-semibold">{selectedRestaurant?.status || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Start Date</div>
                  <div className="font-semibold">{selectedRestaurant?.date || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Next Payment Due</div>
                  <div className="font-semibold text-blue-500">{selectedRestaurant?.nextDue || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Subscription Revenue</div>
                  <div className="font-semibold text-green-500">
                    ₹{payments.reduce((acc, curr) => acc + (parseFloat(curr.amount.replace('₹', '')) || 0), 0)}
                  </div>
                </div>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Payment Transaction Log</h3>
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                  <th className="pb-3 font-medium">Transaction ID</th>
                  <th className="pb-3 font-medium">Plan Paid For</th>
                  <th className="pb-3 font-medium">Amount Paid</th>
                  <th className="pb-3 font-medium">Payment Date</th>
                  <th className="pb-3 font-medium">Next Renewal</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">
                      No payment history available.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-4 text-sm">{payment.id}</td>
                      <td className="py-4 text-sm">{payment.plan}</td>
                      <td className="py-4 text-sm">{payment.amount}</td>
                      <td className="py-4 text-sm">{payment.date}</td>
                      <td className="py-4 text-sm">{payment.nextRenewal}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs ${payment.status === 'Success' ? 'bg-green-100 text-green-700' :
                          payment.status === 'Failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <button className="text-blue-500 hover:text-blue-600 text-sm">View Invoice</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;