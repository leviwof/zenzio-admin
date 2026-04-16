import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  requestOtpChangePassword,
  verifyOtpChangePassword,
  confirmChangePasswordOtp
} from '../../services/api';

const ChangePasswordPage = ({ onClose }) => {
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    // Send OTP on mount
    sendOtp();
  }, []);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const sendOtp = async () => {
    try {
      setLoading(true);
      await requestOtpChangePassword();
      toast.success('OTP sent to your email');
      setTimer(60); // 60 seconds cooldown
    } catch (error) {
      console.error('Failed to request OTP', error);
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (value.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 3) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 4) {
      toast.error('Please enter a valid 4-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const response = await verifyOtpChangePassword(otpValue);
      if (response.data.isValid) {
        setOtpVerified(true);
        toast.success('OTP verified successfully');
      } else {
        toast.error('Invalid OTP');
      }
    } catch (error) {
      console.error('OTP verification failed', error);
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      await confirmChangePasswordOtp(otp.join(''), passwords.newPassword);
      toast.success('Password changed successfully. Please login again.');
      onClose();
    } catch (error) {
      console.error('Password reset failed', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-lg shadow-sm max-w-2xl mx-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Change Password through OTP</h2>
        </div>

        <div className="p-8">
          {!otpVerified ? (
            <>
              <p className="text-sm text-gray-600 mb-8 text-center">
                Enter the OTP sent to your registered email
              </p>

              <div className="flex gap-4 justify-center mb-6">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOTPChange(idx, e.target.value)}
                    className="w-16 h-16 text-center text-2xl border-2 border-gray-300 rounded-md focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                ))}
              </div>

              <div className="text-center text-sm text-gray-600 mb-8">
                {timer > 0 ? (
                  <span>Resend code in <span className="font-semibold text-red-500">{timer}s</span></span>
                ) : (
                  <button
                    onClick={sendOtp}
                    disabled={loading}
                    className="text-red-500 font-semibold hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-8 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="px-8 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium flex items-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Verify OTP
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setOtpVerified(false)}
                  className="text-gray-600 hover:text-gray-800 text-xl"
                >
                  ←
                </button>
                <span className="text-sm text-green-600 font-medium">✓ OTP Verified Successfully</span>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Password Requirements:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Minimum 8 characters</li>
                  <li>• At least one uppercase letter</li>
                  <li>• At least one number</li>
                  <li>• At least one special character</li>
                </ul>
              </div>

              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-8 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium flex items-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Save Password
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;