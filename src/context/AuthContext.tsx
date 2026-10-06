import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, clearAuthToken } from '../services/api.js';
import type { User, Business, BusinessSettings, Subscription } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  business: Business | null;
  settings: BusinessSettings | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  unreadNotificationsCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    businessName: string;
    businessType: any;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateBusinessState: (biz: Business) => void;
  updateSettingsState: (set: BusinessSettings) => void;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unreadNotificationsCount, setUnreadCount] = useState<number>(0);

  const refreshAuth = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setBusiness(data.business || null);
      setSettings(data.settings || null);
      setSubscription(data.subscription || null);

      if (data.business) {
        try {
          const notifs = await api.getNotifications();
          setUnreadCount(notifs.filter((n) => !n.read).length);
        } catch {
          // ignore
        }
      }
    } catch {
      setUser(null);
      setBusiness(null);
      setSettings(null);
      setSubscription(null);
      clearAuthToken();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('bmgh_token');
    if (token) {
      refreshAuth();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setAuthToken(res.token);
    setUser(res.user);
    setBusiness(res.business || null);
    await refreshAuth();
  };

  const register = async (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    businessName: string;
    businessType: any;
  }) => {
    const res = await api.register(data);
    setAuthToken(res.token);
    setUser(res.user);
    setBusiness(res.business);
    await refreshAuth();
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      clearAuthToken();
      setUser(null);
      setBusiness(null);
      setSettings(null);
      setSubscription(null);
    }
  };

  const updateBusinessState = (biz: Business) => {
    setBusiness(biz);
  };

  const updateSettingsState = (set: BusinessSettings) => {
    setSettings(set);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        settings,
        subscription,
        isLoading,
        isAuthenticated: !!user,
        unreadNotificationsCount,
        login,
        register,
        logout,
        refreshAuth,
        updateBusinessState,
        updateSettingsState,
        setUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
