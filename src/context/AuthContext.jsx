import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { getMe } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await getMe();
        const d = res.data?.data || res.data?.user || res.data;
        setUser({
          uid: d.id || d.uid,
          role: d.role,
          restaurantUid: d.restaurantUid || d.restaurant_uid || d.restaurantId || d.restaurant_id || d.restaurantUid,
          email: d.email,
          name: d.name,
        });
      } catch (err) {
        localStorage.removeItem('access_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = useCallback(async (email, password, loginType) => {
    let res;
    if (loginType === 'restaurant') {
      res = await api.post('/restaurant-admin/login', { email, password });
    } else {
      res = await api.post('/super-admin/login', { email, password, role: '1' });
    }

    const { status, data } = res.data;
    if (status !== 'success' || !data?.user || !data?.accessToken) {
      throw new Error('Login failed');
    }

    localStorage.setItem('access_token', data.accessToken);

    const u = {
      uid: data.user.id || data.user.uid,
      role: data.user.role,
      restaurantUid: data.user.restaurantUid || data.user.restaurant_uid || data.user.restaurantId || data.user.restaurant_id,
      email: data.user.email,
      name: data.user.name,
    };

    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/auth/logout', { credentials: 'include' });
    } catch {
      // ignore
    }
    localStorage.removeItem('access_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      loading: false,
      isAuthenticated: false,
      login: async () => { throw new Error('AuthProvider not found'); },
      logout: async () => {},
    };
  }
  return ctx;
};

export default AuthContext;
