import React, { useState, useEffect } from 'react';
import { Shield, CreditCard } from 'lucide-react';
import ChangePasswordPage from './ChangePasswordPage';
import {
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getGlobalSettings,
  updateGlobalSettings
} from '../../services/api';
import { toast } from 'react-hot-toast';

const Settings = () => {
  const [showOTPPage, setShowOTPPage] = useState(false);
  const [platformName, setPlatformName] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [paymentSettings, setPaymentSettings] = useState({
    enableOnlinePayment: true,
    enableCODPayment: true
  });

  useEffect(() => {
    fetchProfile();
    fetchGlobalSettings();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('Fetching admin profile...');
      const response = await getAdminProfile();
      console.log('Profile Response:', response); // DEBUG LOG

      const data = response.data;
      console.log('Profile Data (response.data):', data); // DEBUG LOG

      // Try to find the ID in various places just in case
      // response.data might be the entity (has .id) OR a wrapper (has .data.id or .data.user.id)
      const id = data.id || data.userId || (data.data && (data.data.id || data.data.userId));

      const name = data.name || (data.data && data.data.name) || '';

      if (id) {
        setAdminId(id);
        setPlatformName(name);
        console.log('✅ Admin ID set to:', id);
        console.log('✅ Platform Name set to:', name);
      } else {
        console.error('❌ Could not find Admin ID in response object:', data);
        toast.error('Could not load admin profile data. Please check console for details.');
      }
    } catch (error) {
      console.error('Failed to fetch profile', error);
      toast.error('Failed to load settings: ' + (error.message || 'Unknown error'));
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const response = await getGlobalSettings();
      if (response.data) {
        setPaymentSettings({
          enableOnlinePayment: response.data.enableOnlinePayment,
          enableCODPayment: response.data.enableCODPayment
        });
      }
    } catch (error) {
      console.error('Failed to fetch global settings', error);
      toast.error('Failed to load payment settings');
    }
  };

  const handleTogglePayment = async (key) => {
    try {
      const newValue = !paymentSettings[key];
      // Optimistic update
      setPaymentSettings(prev => ({ ...prev, [key]: newValue }));

      await updateGlobalSettings({
        [key]: newValue
      });

      toast.success(`${key === 'enableOnlinePayment' ? 'Online Payment' : 'Cash on Delivery'} ${newValue ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      // Revert on failure
      setPaymentSettings(prev => ({ ...prev, [key]: !prev[key] }));
      console.error('Failed to update payment settings', error);
      toast.error('Failed to update settings');
    }
  };

  const handleSaveGeneral = async () => {
    console.log('handleSaveGeneral invoked. AdminID:', adminId, 'New Name:', platformName);

    if (!adminId) {
      toast.error('Cannot save: Admin ID not found. The profile data might not have loaded correctly.');
      return;
    }

    try {
      setLoading(true);
      await updateAdminProfile(adminId, { name: platformName });

      // Notify Sidebar to update name
      window.dispatchEvent(new CustomEvent('platformNameUpdated', {
        detail: { name: platformName }
      }));

      toast.success('Platform name updated successfully');
    } catch (error) {
      console.error('Update failed', error);
      toast.error('Failed to update platform name: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('Passwords do not match!');
      return;
    }
    if (!passwords.current || !passwords.new) {
      toast.error('Please fill all password fields');
      return;
    }

    try {
      setLoading(true);
      await changeAdminPassword({
        oldPassword: passwords.current,
        newPassword: passwords.new
      });
      toast.success('Password changed successfully. Please login again.');
      setPasswords({ current: '', new: '', confirm: '' });
      // Optional: Redirect to login or logout
    } catch (error) {
      console.error('Password change failed', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Show OTP password change page
  if (showOTPPage) {
    return (
      <ChangePasswordPage
        onClose={() => setShowOTPPage(false)}
      />
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* General Settings */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
        </div>
        <div className="p-5">
          <div className="mb-4">
            <label className="block text-sm mb-2 flex items-center gap-2">
              <Shield size={18} className="text-indigo-600" />
              Platform Name
            </label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="Enter platform name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveGeneral}
              disabled={loading}
              className={`px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
        </div>
        <div className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-medium text-gray-900">Online Payment</h3>
                  <p className="text-sm text-gray-500">Enable or disable online payment methods (Stripe, PayPal, etc.)</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={paymentSettings.enableOnlinePayment}
                  onChange={() => handleTogglePayment('enableOnlinePayment')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="text-green-600" size={24} />
                <div>
                  <h3 className="font-medium text-gray-900">Cash on Delivery (COD)</h3>
                  <p className="text-sm text-gray-500">Enable or disable cash on delivery option for users</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={paymentSettings.enableCODPayment}
                  onChange={() => handleTogglePayment('enableCODPayment')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings - Password */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
        </div>
        <div className="p-5">
          <h3 className="font-semibold mb-4">Change Password</h3>

          <div className="mb-4">
            <label className="block text-sm mb-2">Current Password</label>
            <input
              type="password"
              name="current"
              value={passwords.current}
              onChange={(e) => {
                const { name, value } = e.target;
                setPasswords(prev => ({ ...prev, [name]: value }));
              }}
              placeholder="Enter current password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-2">New Password</label>
              <input
                type="password"
                name="new"
                value={passwords.new}
                onChange={(e) => {
                  const { name, value } = e.target;
                  setPasswords(prev => ({ ...prev, [name]: value }));
                }}
                placeholder="Enter new password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Confirm New Password</label>
              <input
                type="password"
                name="confirm"
                value={passwords.confirm}
                onChange={(e) => {
                  const { name, value } = e.target;
                  setPasswords(prev => ({ ...prev, [name]: value }));
                }}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSavePassword}
              disabled={loading}
              className={`px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Security Settings - OTP */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Alternative Password Change</h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4">Change your password securely using OTP verification sent to your registered email</p>
          <button
            onClick={() => setShowOTPPage(true)}
            className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Change Password through OTP
          </button>
        </div>
      </div>
    </div>
  );
};
export default Settings;