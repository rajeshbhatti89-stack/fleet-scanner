import { Vehicle, Operator, MeterLog, StorageStats } from '../types';
import { getSupabaseClient, getStoredSupabaseConfig } from './supabase';
import { dataUrlToBlob } from './imageUtils';

const LOCAL_STORAGE_KEYS = {
  VEHICLES: 'fleetlog_vehicles_prod_v2',
  OPERATORS: 'fleetlog_operators_prod_v2',
  LOGS: 'fleetlog_logs_prod_v2'
};

// Clean out any legacy mock data from previous version
try {
  localStorage.removeItem('fleetlog_vehicles_v1');
  localStorage.removeItem('fleetlog_operators_v1');
  localStorage.removeItem('fleetlog_logs_v1');
} catch (e) {
  // ignore
}

// Default operators seeded for quick testing and fallback
const DEFAULT_OPERATORS: Operator[] = [
  {
    operator_id: 'OP-101',
    operator_name: 'Shift Operator 1',
    phone_number: '+1 555-0101',
    status: 'Active'
  },
  {
    operator_id: 'OP-102',
    operator_name: 'Shift Operator 2',
    phone_number: '+1 555-0102',
    status: 'Active'
  }
];

// Initialize LocalStorage with empty arrays if not present
const initLocalStore = () => {
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.VEHICLES)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.VEHICLES, JSON.stringify([]));
  }
  const existingOps = localStorage.getItem(LOCAL_STORAGE_KEYS.OPERATORS);
  if (!existingOps || existingOps === '[]') {
    localStorage.setItem(LOCAL_STORAGE_KEYS.OPERATORS, JSON.stringify(DEFAULT_OPERATORS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify([]));
  }
};

initLocalStore();

// ==========================================
// VEHICLES REPOSITORY
// ==========================================

/**
 * Intelligently resolves a Vehicle from a scanned QR token, full URL, vehicle ID, or machine name.
 * Supports case-insensitivity, whitespace trimming, URL extraction, alphanumeric normalization, and digit extraction.
 */
export const resolveVehicle = (input: string, vehicles: Vehicle[]): Vehicle | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. If input is a full URL (e.g. http://.../#scan=TOKEN or ?scan=TOKEN or /scan/TOKEN)
  let extracted = trimmed;
  const hashMatch = trimmed.match(/[#?]scan=([^&]+)/i);
  if (hashMatch && hashMatch[1]) {
    try {
      extracted = decodeURIComponent(hashMatch[1]).trim();
    } catch {
      extracted = hashMatch[1].trim();
    }
  } else {
    const pathMatch = trimmed.match(/\/scan\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      try {
        extracted = decodeURIComponent(pathMatch[1]).trim();
      } catch {
        extracted = pathMatch[1].trim();
      }
    }
  }

  // 1b. Check if input contains embedded vehicle parameters from QR code (vid=...)
  const vidMatch = trimmed.match(/[#&?]vid=([^&]+)/i);
  if (vidMatch) {
    const vid = decodeURIComponent(vidMatch[1]).trim();
    // Check if vehicle already exists in fleet roster
    const existing = vehicles.find(v => v.vehicle_id.toLowerCase() === vid.toLowerCase());
    if (existing) return existing;

    // Otherwise reconstruct vehicle from self-contained QR code payload
    const nameMatch = trimmed.match(/[#&?]name=([^&]+)/i);
    const typeMatch = trimmed.match(/[#&?]type=([^&]+)/i);
    const lastMatch = trimmed.match(/[#&?]last=([^&]+)/i);
    const tokenMatch = trimmed.match(/[#&?]scan=([^&]+)/i);
    return {
      vehicle_id: vid,
      machine_name: nameMatch ? decodeURIComponent(nameMatch[1]).trim() : vid,
      reading_type: (typeMatch && decodeURIComponent(typeMatch[1]).toUpperCase() === 'KM') ? 'KM' : 'HOURS',
      qr_code_token: tokenMatch ? decodeURIComponent(tokenMatch[1]).trim() : `qr-${vid}`,
      last_known_reading: lastMatch ? parseFloat(decodeURIComponent(lastMatch[1])) || 0 : 0,
      status: 'Active'
    };
  }

  const lowerExtracted = extracted.toLowerCase();
  const lowerRaw = trimmed.toLowerCase();

  // 2. Direct exact or case-insensitive match on qr_code_token or vehicle_id
  let found = vehicles.find(v =>
    v.qr_code_token?.toLowerCase() === lowerExtracted ||
    v.vehicle_id?.toLowerCase() === lowerExtracted ||
    v.qr_code_token?.toLowerCase() === lowerRaw ||
    v.vehicle_id?.toLowerCase() === lowerRaw
  );
  if (found) return found;

  // 3. Direct match against machine_name
  found = vehicles.find(v =>
    v.machine_name?.toLowerCase() === lowerExtracted ||
    v.machine_name?.toLowerCase() === lowerRaw
  );
  if (found) return found;

  // 4. Normalized alphanumeric match (stripping spaces, dashes, underscores)
  const clean = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanExtracted = clean(extracted);
  const cleanRaw = clean(trimmed);

  if (cleanExtracted || cleanRaw) {
    found = vehicles.find(v => {
      const vId = clean(v.vehicle_id);
      const vName = clean(v.machine_name);
      const vToken = clean(v.qr_code_token);
      return (
        (cleanExtracted && (vId === cleanExtracted || vName === cleanExtracted || vToken === cleanExtracted)) ||
        (cleanRaw && (vId === cleanRaw || vName === cleanRaw || vToken === cleanRaw))
      );
    });
    if (found) return found;

    // 5. If input is numeric (e.g. "1" or "01"), match vehicle whose numeric component matches
    const numericPart = cleanRaw.replace(/\D/g, '') || cleanExtracted.replace(/\D/g, '');
    if (numericPart) {
      const targetNum = parseInt(numericPart, 10);
      found = vehicles.find(v => {
        const vIdDigits = (v.vehicle_id.match(/\d+/) || [])[0];
        if (vIdDigits && parseInt(vIdDigits, 10) === targetNum) return true;
        const vNameDigits = (v.machine_name.match(/\d+/) || [])[0];
        if (vNameDigits && parseInt(vNameDigits, 10) === targetNum) return true;
        return false;
      });
      if (found) return found;
    }

    // 6. Substring contains match
    found = vehicles.find(v =>
      (cleanExtracted && (clean(v.vehicle_id).includes(cleanExtracted) || clean(v.machine_name).includes(cleanExtracted))) ||
      (cleanRaw && (clean(v.vehicle_id).includes(cleanRaw) || clean(v.machine_name).includes(cleanRaw)))
    );
    if (found) return found;
  }

  return null;
};

export const getVehicles = async (): Promise<Vehicle[]> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('vehicles').select('*').order('vehicle_id');
      if (!error && data) return data as Vehicle[];
      console.warn('Supabase getVehicles error, falling back to local store:', error);
    } catch (e) {
      console.warn('Supabase fetch failed:', e);
    }
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.VEHICLES);
  return raw ? JSON.parse(raw) : [];
};

export const getVehicleByToken = async (qrToken: string): Promise<Vehicle | null> => {
  const vehicles = await getVehicles();
  return resolveVehicle(qrToken, vehicles);
};

export const saveVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .upsert({
          ...vehicle,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (!error && data) return data as Vehicle;
      console.warn('Supabase saveVehicle error:', error);
    } catch (e) {
      console.warn('Supabase upsert failed:', e);
    }
  }

  // Local fallback
  const vehicles = await getVehicles();
  const idx = vehicles.findIndex(v => v.vehicle_id === vehicle.vehicle_id);
  if (idx >= 0) {
    vehicles[idx] = { ...vehicle, updated_at: new Date().toISOString() };
  } else {
    vehicles.push({ ...vehicle, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  localStorage.setItem(LOCAL_STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  return vehicle;
};

export const bulkUpsertVehicles = async (newVehicles: Vehicle[]): Promise<{ count: number }> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const payload = newVehicles.map(v => ({
        ...v,
        updated_at: new Date().toISOString()
      }));
      const { data, error } = await supabase.from('vehicles').upsert(payload);
      if (!error) return { count: newVehicles.length };
    } catch (e) {
      console.warn('Supabase bulk upsert failed, saving to local store:', e);
    }
  }

  const existing = await getVehicles();
  const map = new Map<string, Vehicle>(existing.map(v => [v.vehicle_id, v]));
  for (const item of newVehicles) {
    map.set(item.vehicle_id, { ...item, updated_at: new Date().toISOString() });
  }
  const merged = Array.from(map.values());
  localStorage.setItem(LOCAL_STORAGE_KEYS.VEHICLES, JSON.stringify(merged));
  return { count: newVehicles.length };
};

export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('vehicles').delete().eq('vehicle_id', vehicleId);
      if (error) console.warn('Supabase deleteVehicle error:', error);
    } catch (e) {
      console.warn('Supabase deleteVehicle failed:', e);
    }
  }

  const vehicles = await getVehicles();
  const filtered = vehicles.filter(v => v.vehicle_id !== vehicleId);
  localStorage.setItem(LOCAL_STORAGE_KEYS.VEHICLES, JSON.stringify(filtered));
  return true;
};

// ==========================================
// OPERATORS REPOSITORY
// ==========================================

export const getOperators = async (): Promise<Operator[]> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('operators').select('*').order('operator_name');
      if (!error && data) return data as Operator[];
    } catch (e) {
      console.warn('Supabase getOperators failed:', e);
    }
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.OPERATORS);
  return raw ? JSON.parse(raw) : [];
};

export const saveOperator = async (operator: Operator): Promise<Operator> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('operators')
        .upsert(operator)
        .select()
        .single();
      if (!error && data) return data as Operator;
    } catch (e) {
      console.warn('Supabase saveOperator failed:', e);
    }
  }

  const operators = await getOperators();
  const idx = operators.findIndex(o => o.operator_id === operator.operator_id);
  if (idx >= 0) {
    operators[idx] = operator;
  } else {
    operators.push({ ...operator, created_at: new Date().toISOString() });
  }
  localStorage.setItem(LOCAL_STORAGE_KEYS.OPERATORS, JSON.stringify(operators));
  return operator;
};

export const bulkUpsertOperators = async (newOperators: Operator[]): Promise<{ count: number }> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('operators').upsert(newOperators);
      if (!error) return { count: newOperators.length };
    } catch (e) {
      console.warn('Supabase bulk operators failed:', e);
    }
  }

  const existing = await getOperators();
  const map = new Map<string, Operator>(existing.map(o => [o.operator_id, o]));
  for (const item of newOperators) {
    map.set(item.operator_id, item);
  }
  const merged = Array.from(map.values());
  localStorage.setItem(LOCAL_STORAGE_KEYS.OPERATORS, JSON.stringify(merged));
  return { count: newOperators.length };
};

export const deleteOperator = async (operatorId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('operators').delete().eq('operator_id', operatorId);
      if (error) console.warn('Supabase deleteOperator error:', error);
    } catch (e) {
      console.warn('Supabase deleteOperator failed:', e);
    }
  }

  const operators = await getOperators();
  const filtered = operators.filter(o => o.operator_id !== operatorId);
  localStorage.setItem(LOCAL_STORAGE_KEYS.OPERATORS, JSON.stringify(filtered));
  return true;
};

// ==========================================
// STORAGE UPLOAD (SUPABASE STORAGE BUCKET)
// ==========================================

export const uploadMeterPhoto = async (
  vehicleId: string,
  compressedDataUrl: string
): Promise<string> => {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const blob = dataUrlToBlob(compressedDataUrl);
      const filename = `${vehicleId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

      const { data, error } = await supabase.storage
        .from('meter-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('meter-photos')
          .getPublicUrl(filename);
        return publicUrlData.publicUrl;
      }
      console.warn('Storage upload error, using local fallback:', error);
    } catch (e) {
      console.warn('Storage upload failed:', e);
    }
  }

  // Fallback: return compressed DataURL directly (compressed <500KB)
  return compressedDataUrl;
};

// ==========================================
// METER LOGS REPOSITORY
// ==========================================

export interface LogFilterParams {
  dateFrom?: string;
  dateTo?: string;
  vehicleId?: string;
  operatorId?: string;
  flaggedOnly?: boolean;
}

export const getMeterLogs = async (filters?: LogFilterParams): Promise<MeterLog[]> => {
  let logs: MeterLog[] = [];
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      let query = supabase.from('meter_logs').select(`
        *,
        vehicle:vehicles(*),
        operator:operators(*)
      `).order('timestamp', { ascending: false });

      if (filters?.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
      if (filters?.operatorId) query = query.eq('operator_id', filters.operatorId);
      if (filters?.flaggedOnly) query = query.eq('flagged_status', true);
      if (filters?.dateFrom) query = query.gte('timestamp', new Date(filters.dateFrom).toISOString());
      if (filters?.dateTo) {
        const endDay = new Date(filters.dateTo);
        endDay.setHours(23, 59, 59, 999);
        query = query.lte('timestamp', endDay.toISOString());
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as MeterLog[];
      }
      console.warn('Supabase getMeterLogs failed, using local store:', error);
    } catch (e) {
      console.warn('Supabase fetch failed:', e);
    }
  }

  // Local store fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS);
  logs = raw ? JSON.parse(raw) : [];

  const [vehicles, operators] = await Promise.all([getVehicles(), getOperators()]);
  const vehicleMap = new Map(vehicles.map(v => [v.vehicle_id, v]));
  const operatorMap = new Map(operators.map(o => [o.operator_id, o]));

  // Attach joins
  logs = logs.map(l => ({
    ...l,
    vehicle: vehicleMap.get(l.vehicle_id),
    operator: operatorMap.get(l.operator_id)
  }));

  // Apply filters in memory
  if (filters?.vehicleId) {
    logs = logs.filter(l => l.vehicle_id === filters.vehicleId);
  }
  if (filters?.operatorId) {
    logs = logs.filter(l => l.operator_id === filters.operatorId);
  }
  if (filters?.flaggedOnly) {
    logs = logs.filter(l => l.flagged_status === true);
  }
  if (filters?.dateFrom) {
    const fromTime = new Date(filters.dateFrom).getTime();
    logs = logs.filter(l => new Date(l.timestamp).getTime() >= fromTime);
  }
  if (filters?.dateTo) {
    const toTime = new Date(filters.dateTo).setHours(23, 59, 59, 999);
    logs = logs.filter(l => new Date(l.timestamp).getTime() <= toTime);
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const saveMeterLog = async (logData: Omit<MeterLog, 'log_id'> & { log_id?: string }): Promise<MeterLog> => {
  const log_id = logData.log_id || 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const newLog: MeterLog = {
    ...logData,
    log_id,
    timestamp: logData.timestamp || new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Strip UI join fields before inserting into Supabase
      const { vehicle, operator, ...dbPayload } = newLog;
      const { data, error } = await supabase.from('meter_logs').insert(dbPayload).select().single();
      
      if (!error && data) {
        // Also update vehicle's last_known_reading in Supabase
        await supabase
          .from('vehicles')
          .update({ last_known_reading: newLog.confirmed_reading, updated_at: new Date().toISOString() })
          .eq('vehicle_id', newLog.vehicle_id);

        return data as MeterLog;
      }
      console.warn('Supabase saveMeterLog failed, saving locally:', error);
    } catch (e) {
      console.warn('Supabase insert failed:', e);
    }
  }

  // Local fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS);
  const logs: MeterLog[] = raw ? JSON.parse(raw) : [];
  logs.unshift(newLog);
  localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify(logs));

  // Also update vehicle last_known_reading locally
  const vehicles = await getVehicles();
  const vIdx = vehicles.findIndex(v => v.vehicle_id === newLog.vehicle_id);
  if (vIdx >= 0) {
    vehicles[vIdx].last_known_reading = newLog.confirmed_reading;
    vehicles[vIdx].updated_at = new Date().toISOString();
    localStorage.setItem(LOCAL_STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  }

  return newLog;
};

export const deleteMeterLog = async (logId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('meter_logs').delete().eq('log_id', logId);
      if (error) console.warn('Supabase deleteMeterLog error:', error);
    } catch (e) {
      console.warn('Supabase deleteMeterLog failed:', e);
    }
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS);
  if (raw) {
    const logs: MeterLog[] = JSON.parse(raw);
    const filtered = logs.filter(l => l.log_id !== logId);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify(filtered));
  }
  return true;
};

export const updateMeterLog = async (logId: string, updates: Partial<MeterLog>): Promise<MeterLog | null> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { vehicle, operator, ...dbPayload } = updates;
      const { data, error } = await supabase
        .from('meter_logs')
        .update(dbPayload)
        .eq('log_id', logId)
        .select()
        .single();
      if (!error && data) return data as MeterLog;
    } catch (e) {
      console.warn('Supabase update log failed:', e);
    }
  }

  // Local fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS);
  const logs: MeterLog[] = raw ? JSON.parse(raw) : [];
  const idx = logs.findIndex(l => l.log_id === logId);
  if (idx >= 0) {
    logs[idx] = { ...logs[idx], ...updates };
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify(logs));
    return logs[idx];
  }
  return null;
};

// ==============================================================================
// STORAGE MANAGEMENT & AUTO-PURGE RETENTION IMPLEMENTATION
// ==============================================================================

export const getStorageStats = async (): Promise<StorageStats> => {
  const logs = await getMeterLogs();
  let totalImages = 0;
  let purgedImages = 0;
  let totalEstimatedBytes = 0;

  for (const log of logs) {
    if (log.raw_image_url === 'purged_due_to_retention') {
      purgedImages++;
    } else if (log.raw_image_url && log.raw_image_url.length > 0) {
      totalImages++;
      // Estimate size: if base64, calculate length; if url, average 350KB
      if (log.raw_image_url.startsWith('data:')) {
        totalEstimatedBytes += Math.round((log.raw_image_url.length * 3) / 4);
      } else {
        totalEstimatedBytes += 350 * 1024;
      }
    }
  }

  return {
    totalImages,
    purgedImages,
    estimatedStorageBytes: totalEstimatedBytes,
    retentionDays: 60,
    capacityWatermarkPct: Math.min(100, Math.round((totalImages / 200) * 100)) // Scaled metric
  };
};

/**
 * Executes retention policy cleanup:
 * - Deletes odometer photos older than retentionDays (default 60 days) OR if capacity reaches 80%
 * - Permanently preserves the meter log record (timestamp, vehicle_id, operator_id, confirmed_reading, gps)
 * - Sets raw_image_url = 'purged_due_to_retention'
 */
export const executeRetentionPurge = async (
  retentionDays = 60,
  forcePurgeOldest = false
): Promise<{ purgedCount: number; message: string }> => {
  const cutoffTime = Date.now() - retentionDays * 86400000;
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      // 1. Check if Supabase stored procedure or Edge Function is available
      const { data, error } = await supabase.rpc('purge_meter_photos_retention', {
        p_retention_days: retentionDays,
        p_batch_limit: 500
      });

      if (!error && data && data.length > 0) {
        return {
          purgedCount: data[0].purged_count,
          message: `Purged ${data[0].purged_count} photos via Supabase retention routine. Meter audit rows preserved.`
        };
      }
    } catch (e) {
      console.warn('Supabase RPC purge failed, executing fallback table scan:', e);
    }
  }

  // Local / client-side cleanup execution
  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS);
  const logs: MeterLog[] = raw ? JSON.parse(raw) : [];
  let purgedCount = 0;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const logTime = new Date(log.timestamp).getTime();
    const isOld = logTime < cutoffTime;
    const hasActivePhoto = log.raw_image_url && log.raw_image_url !== 'purged_due_to_retention';

    if ((isOld || forcePurgeOldest) && hasActivePhoto) {
      logs[i] = {
        ...log,
        raw_image_url: 'purged_due_to_retention',
        notes: (log.notes ? log.notes + ' | ' : '') + `Photo purged on ${new Date().toLocaleDateString()} per 60-day retention policy.`
      };
      purgedCount++;
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify(logs));

  return {
    purgedCount,
    message: `Purged ${purgedCount} photo(s) older than ${retentionDays} days. All audit logs and readings permanently preserved.`
  };
};
