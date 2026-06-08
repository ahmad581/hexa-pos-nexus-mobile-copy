// src/services/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Browser-local storage adapter for Supabase auth on web
const BrowserStorage = {
  getItem: async (key: string) => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return v;
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    } catch (e) {
      // ignore
    }
  },
  removeItem: async (key: string) => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  },
};

// TODO: Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const isWeb = Platform?.OS === 'web' || (typeof window !== 'undefined' && typeof navigator !== 'undefined');

function makeQueryStub() {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    not: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => chain,
    single: () => chain,
    update: () => chain,
    insert: () => chain,
    delete: () => chain,
    then: (cb: any) => {
      const res = { data: null, error: new Error('Supabase not configured (missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)') };
      return Promise.resolve(res).then(cb);
    },
    catch: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
  };
  return chain;
}

// If env is missing, provide a stub that fails gracefully instead of throwing on import
let supabaseVar: any = null;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars missing: EXPO_PUBLIC_SUPABASE_URL and/or EXPO_PUBLIC_SUPABASE_ANON_KEY. Supabase client will be a stub.');

  supabaseVar = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async (creds: any) => {
        // Support a developer fake-login mode via EXPO_DEV_FAKE_LOGIN or auto-enable in dev
        const allowFake = (process.env.EXPO_DEV_FAKE_LOGIN === 'true') || (typeof __DEV__ !== 'undefined' && __DEV__ === true);
        if (allowFake) {
          const fakeUser = { id: 'dev-user', email: creds.email };
          const fakeSession = { access_token: 'dev-token', user: fakeUser };
          return { data: { user: fakeUser, session: fakeSession }, error: null };
        }
        return { data: { user: null, session: null }, error: { message: 'Supabase not configured (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY missing)' } };
      },
      signOut: async () => ({ error: null }),
    },
    from: (_: string) => makeQueryStub(),
    rpc: () => makeQueryStub(),
  };
} else {
  supabaseVar = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: isWeb ? BrowserStorage : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase: any = supabaseVar;
