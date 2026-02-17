import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [hiredPrebuilt, setHiredPrebuilt] = useState(null); // null = loading, [] = loaded but empty

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      // Fetch hired prebuilt state for sidebar gating
      try {
        const configRes = await axios.get(`${API}/config`);
        const hired = configRes.data?.hired_prebuilt || [];
        setHiredPrebuilt(hired);
      } catch (e) {
        // Config fetch is non-critical
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const updateHiredPrebuilt = (newHired) => {
    setHiredPrebuilt(newHired);
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, businessName) => {
    const response = await axios.post(`${API}/auth/register`, {
      email,
      password,
      name,
      business_name: businessName
    });
    const { token: newToken, user: userData, message } = response.data;

    // If no token returned, email verification is required
    if (!newToken) {
      return {
        requiresEmailVerification: true,
        message: message || "Please check your email to confirm your account.",
        user: userData
      };
    }

    // Only log in if token is provided (email already verified)
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    return { requiresEmailVerification: false, user: userData };
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user, hiredPrebuilt, updateHiredPrebuilt }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
