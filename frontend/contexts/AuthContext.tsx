'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (userData: { username: string; name: string; password: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = useMemo(() => !!user, [user]);
  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user]);

  // Check if user is logged in on mount
  useEffect(() => {
    let mounted = true;
    let checked = false;

    const checkAuth = async () => {
      if (checked || !mounted) return; // Prevent multiple checks
      checked = true;

      console.log('AuthContext: Starting auth check');

      try {
        const token = localStorage.getItem('accessToken');
        console.log('AuthContext: Token exists:', !!token);

        if (token && mounted) {
          const response = await authAPI.verify();
          if (mounted) {
            console.log('AuthContext: Auth verification successful:', response.data.user.username);
            setUser(response.data.user);
          }
        } else if (mounted) {
          console.log('AuthContext: No token found, setting user to null');
          setUser(null);
        }
      } catch (error) {
        console.log('AuthContext: Auth verification failed:', error);
        // Token is invalid, clear it
        if (mounted) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
      } finally {
        if (mounted) {
          console.log('AuthContext: Setting loading to false');
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      console.log('AuthContext: Cleanup - setting mounted to false');
      mounted = false;
    };
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    try {
      const response = await authAPI.login(credentials);
      const { user: userData, accessToken, refreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (userData: { username: string; name: string; password: string }) => {
    try {
      const response = await authAPI.register(userData);
      const { user: newUser, accessToken, refreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(newUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    // Call logout API (optional, since JWT is stateless)
    authAPI.logout().catch(() => {
      // Ignore errors on logout
    });
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
