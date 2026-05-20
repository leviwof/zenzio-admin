import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import adminLogo from '../../assets/logoadmin.png';
import restaurantLogo from '../../assets/logo.png';

const LOGIN_TYPES = {
  admin: { label: 'Zenzio Admin', role: '1', endpoint: 'admin' },
  restaurant: { label: 'Restaurant Admin', role: '2', endpoint: 'restaurant' },
};

const AdminLogin = () => {
  const [loginType, setLoginType] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const config = LOGIN_TYPES[loginType];
  const isAdmin = loginType === 'admin';
  const logo = isAdmin ? adminLogo : restaurantLogo;

  const sessionExpired = new URLSearchParams(window.location.search).get('session_expired') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(email, password, config.endpoint);
      const role = user.role;
      if (role === 'SUPER_ADMIN' || role === '1') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/restaurant/orders', { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Invalid credentials'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <div className="mb-6 text-center">
          <img src={logo} alt={config.label} className="mx-auto h-24" />
          <h2 className="text-xl font-semibold text-gray-800 mt-4">{config.label}</h2>
        </div>

        <div className="mb-6">
          <select
            value={loginType}
            onChange={(e) => setLoginType(e.target.value)}
            className="w-full px-4 py-3 border rounded bg-white text-gray-700 cursor-pointer"
          >
            {Object.entries(LOGIN_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {sessionExpired && (
          <div className="mb-4 p-3 text-yellow-600 bg-yellow-50 border border-yellow-200 rounded">
            Your session has expired. Please log in again.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 text-red-600 bg-red-50 border rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mb-4 px-4 py-3 border rounded"
          />

          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white rounded transition disabled:opacity-50 ${isAdmin ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {loading ? 'Logging in...' : `Login as ${config.label}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
