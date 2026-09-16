import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://fspfwidfdnqvpgmipate.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcGZ3aWRmZG5xdnBnbWlwYXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDYzOTYsImV4cCI6MjA5OTU4MjM5Nn0.tqA4ABfDhZP_PdH2Wv-FrQWzFGfG8vgaTnyZKwFMtHM';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

// Universal Storage Adapter to prevent native module crashes on web views
const memoryStorage = new Map();

const customStorage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    try {
      const val = await AsyncStorage.getItem(key);
      console.log('customStorage getItem key:', key, 'exists:', !!val);
      return val;
    } catch (e) {
      console.warn('customStorage getItem failed, using memory fallback:', e.message);
      return memoryStorage.get(key) || null;
    }
  },
  setItem: async (key, value) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
      console.log('customStorage setItem key:', key, 'success');
    } catch (e) {
      console.warn('customStorage setItem failed, using memory fallback:', e.message);
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
      console.log('customStorage removeItem key:', key, 'success');
    } catch (e) {
      console.warn('customStorage removeItem failed, using memory fallback:', e.message);
      memoryStorage.delete(key);
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

supabase.instanceId = Math.random().toString(36).substring(2, 9);
console.log('--- SUPABASE INSTANCE CREATED --- ID:', supabase.instanceId);

export default supabase;
