import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Universal Storage Utility
 * Safely handles storage between Web (localStorage) and Mobile (SecureStore)
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error('SecureStore error:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error('SecureStore error:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('SecureStore error:', e);
    }
  }
};
