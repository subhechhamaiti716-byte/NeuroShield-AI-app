import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set this to your actual FastAPI backend URL
export const API_URL = 'https://neuroshield-ai-app.onrender.com';

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
