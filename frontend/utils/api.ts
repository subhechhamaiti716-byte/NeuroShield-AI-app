import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set this to your actual FastAPI backend URL via .env or hardcoded fallback
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically add JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
