import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';
import { router } from 'expo-router';

interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await SecureStore.getItemAsync('userToken');
      if (storedToken) {
        setToken(storedToken);
        await fetchUserProfile(storedToken);
      }
    } catch (e) {
      console.error('Failed to load auth', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserProfile(authToken: string) {
    try {
      const response = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser(response.data);
    } catch (e) {
      console.error('Failed to fetch user profile', e);
      logout();
    }
  }

  async function login(authToken: string) {
    setToken(authToken);
    await SecureStore.setItemAsync('userToken', authToken);
    await fetchUserProfile(authToken);
  }

  async function logout() {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync('userToken');
    router.replace('/login');
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
