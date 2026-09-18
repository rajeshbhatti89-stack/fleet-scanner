export type ReadingType = 'KM' | 'HOURS';
export type VehicleStatus = 'Active' | 'Inactive';
export type OperatorStatus = 'Active' | 'Inactive';

export interface Vehicle {
  vehicle_id: string;
  machine_name: string;
  reading_type: ReadingType;
  qr_code_token: string;
  last_known_reading: number;
  status: VehicleStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Operator {
  operator_id: string;
  operator_name: string;
  phone_number?: string;
  status: OperatorStatus;
  created_at?: string;
  updated_at?: string;
}

export interface GpsCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
}

export interface MeterLog {
  log_id: string;
  timestamp: string;
  vehicle_id: string;
  operator_id: string;
  raw_image_url: string | null; // URL or 'purged_due_to_retention'
  ocr_extracted_reading: number | null;
  confirmed_reading: number;
  previous_reading: number;
  reading_difference: number;
  gps_coordinates: GpsCoordinates | null;
  flagged_status: boolean;
  flag_reason?: string | null;
  notes?: string | null;
  created_at?: string;
  
  // Joined display fields
  vehicle?: Vehicle;
  operator?: Operator;
}

export interface StorageStats {
  totalImages: number;
  purgedImages: number;
  estimatedStorageBytes: number;
  retentionDays: number;
  capacityWatermarkPct: number;
}
