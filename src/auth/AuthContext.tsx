import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsApi, hashPin } from '@/api/supabase-api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isPinSet: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setNewPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'budget_planner_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinSet, setIsPinSet] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const settings = await settingsApi.getSettings();
      setIsPinSet(!!settings?.pin_hash);
      
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const { expiry } = JSON.parse(session);
        if (new Date().getTime() < expiry) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const settings = await settingsApi.getSettings();
      
      if (!settings?.pin_hash) {
        return { success: false, error: 'PIN not configured. Please set up your PIN first.' };
      }
      
      const inputHash = hashPin(pin);
      
      if (inputHash !== settings.pin_hash) {
        return { success: false, error: 'Invalid PIN' };
      }
      
      const expiry = new Date().getTime() + 24 * 60 * 60 * 1000;
      localStorage.setItem(SESSION_KEY, JSON.stringify({ expiry }));
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const setNewPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const pinHash = hashPin(pin);
      await settingsApi.setPin(pinHash);
      setIsPinSet(true);
      
      const expiry = new Date().getTime() + 24 * 60 * 60 * 1000;
      localStorage.setItem(SESSION_KEY, JSON.stringify({ expiry }));
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to set PIN' };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    isPinSet,
    login,
    logout,
    setNewPin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
