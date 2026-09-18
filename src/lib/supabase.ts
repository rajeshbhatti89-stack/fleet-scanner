import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  URL: 'fleetlog_supabase_url',
  ANON_KEY: 'fleetlog_supabase_anon_key',
  MODE: 'fleetlog_backend_mode' // 'supabase' | 'local'
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  mode: 'supabase' | 'local';
}

let supabaseInstance: SupabaseClient | null = null;

export const getStoredSupabaseConfig = (): SupabaseConfig => {
  const url = localStorage.getItem(STORAGE_KEYS.URL) || '';
  const anonKey = localStorage.getItem(STORAGE_KEYS.ANON_KEY) || '';
  const mode = (localStorage.getItem(STORAGE_KEYS.MODE) as 'supabase' | 'local') || (url && anonKey ? 'supabase' : 'local');
  
  return {
    url,
    anonKey,
    isConnected: !!(url && anonKey),
    mode
  };
};

export const saveSupabaseConfig = (url: string, anonKey: string, mode: 'supabase' | 'local'): void => {
  localStorage.setItem(STORAGE_KEYS.URL, url.trim());
  localStorage.setItem(STORAGE_KEYS.ANON_KEY, anonKey.trim());
  localStorage.setItem(STORAGE_KEYS.MODE, mode);
  supabaseInstance = null; // reset client to reload with new config
};

export const getSupabaseClient = (): SupabaseClient | null => {
  const config = getStoredSupabaseConfig();
  if (config.mode !== 'supabase' || !config.url || !config.anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
};

export const testSupabaseConnection = async (url: string, anonKey: string): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
  if (!url || !anonKey) {
    return { success: false, message: 'URL and Anon Key are required.' };
  }

  const start = performance.now();
  try {
    const tempClient = createClient(url.trim(), anonKey.trim());
    const { error } = await tempClient.from('vehicles').select('vehicle_id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      // If table doesn't exist yet, but authentication worked
      if (error.code === '42P01') {
        return {
          success: true,
          latencyMs,
          message: 'Connected! Note: tables not found yet. Please run supabase_schema.sql in the SQL Editor.'
        };
      }
      return { success: false, message: `Database error: ${error.message}` };
    }

    return {
      success: true,
      latencyMs,
      message: `Connected successfully (${latencyMs}ms latency).`
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection attempt failed.' };
  }
};
