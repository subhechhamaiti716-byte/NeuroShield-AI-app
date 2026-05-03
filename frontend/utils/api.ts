import { Platform } from 'react-native';
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

// Helper to get token safely on Web and Native
const getToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userToken');
  }
  return await SecureStore.getItemAsync('userToken');
};

// Interceptor to automatically add JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
