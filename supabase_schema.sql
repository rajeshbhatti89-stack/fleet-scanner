-- ==============================================================================
-- FleetLog Pro - Supabase PostgreSQL Database Schema & Storage Configuration
-- Mobile-First Fleet Odometer & Hour-Meter Logging System
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- Optional: for automated in-database cron

-- 2. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
    vehicle_id VARCHAR(64) PRIMARY KEY,
    machine_name VARCHAR(128) NOT NULL,
    reading_type VARCHAR(16) NOT NULL CHECK (reading_type IN ('KM', 'HOURS')),
    qr_code_token VARCHAR(128) NOT NULL UNIQUE,
    last_known_reading NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(16) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. OPERATORS TABLE
CREATE TABLE IF NOT EXISTS public.operators (
    operator_id VARCHAR(64) PRIMARY KEY,
    operator_name VARCHAR(128) NOT NULL,
    phone_number VARCHAR(32),
    status VARCHAR(16) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. METER LOGS TABLE
CREATE TABLE IF NOT EXISTS public.meter_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vehicle_id VARCHAR(64) NOT NULL REFERENCES public.vehicles(vehicle_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    operator_id VARCHAR(64) NOT NULL REFERENCES public.operators(operator_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    raw_image_url TEXT, -- URL in storage bucket or 'purged_due_to_retention'
    ocr_extracted_reading NUMERIC(12, 2),
    confirmed_reading NUMERIC(12, 2) NOT NULL,
    previous_reading NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reading_difference NUMERIC(12, 2) NOT NULL,
    gps_coordinates JSONB, -- { lat: float, lng: float, accuracy: float, address?: string }
    flagged_status BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason TEXT, -- e.g. "Reading lower than previous", "Abnormal shift jump > 500 KM"
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for blazing fast mobile lookups & dashboard analytics
CREATE INDEX IF NOT EXISTS idx_vehicles_qr_token ON public.vehicles(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_meter_logs_vehicle ON public.meter_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_meter_logs_operator ON public.meter_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_meter_logs_timestamp ON public.meter_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_meter_logs_flagged ON public.meter_logs(flagged_status);

-- 5. TRIGGER: AUTO UPDATE LAST KNOWN READING IN VEHICLES
CREATE OR REPLACE FUNCTION public.update_vehicle_last_reading()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.vehicles
    SET 
        last_known_reading = NEW.confirmed_reading,
        updated_at = NOW()
    WHERE vehicle_id = NEW.vehicle_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_vehicle_reading ON public.meter_logs;
CREATE TRIGGER trg_update_vehicle_reading
AFTER INSERT ON public.meter_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_vehicle_last_reading();

-- 6. STORAGE RETENTION & AUTO-PURGE ROUTINE
-- Retention Policy:
-- 1. Deletes odometer photos older than 60 days OR when storage reaches 80% watermark.
-- 2. Retains meter_logs rows permanently for accounting/fleet audit.
-- 3. Sets raw_image_url = 'purged_due_to_retention'

CREATE OR REPLACE FUNCTION public.purge_meter_photos_retention(
    p_retention_days INT DEFAULT 60,
    p_batch_limit INT DEFAULT 1000
)
RETURNS TABLE (
    purged_count INT,
    oldest_purged_timestamp TIMESTAMPTZ,
    newest_purged_timestamp TIMESTAMPTZ
) AS $$
DECLARE
    v_purged_count INT := 0;
    v_min_ts TIMESTAMPTZ;
    v_max_ts TIMESTAMPTZ;
BEGIN
    -- Select eligible logs where photos are older than retention period
    -- and have not already been purged
    WITH eligible_logs AS (
        SELECT log_id, timestamp
        FROM public.meter_logs
        WHERE timestamp < (NOW() - (p_retention_days || ' days')::INTERVAL)
          AND raw_image_url IS NOT NULL
          AND raw_image_url NOT IN ('purged_due_to_retention', '')
        ORDER BY timestamp ASC
        LIMIT p_batch_limit
    ),
    updated_rows AS (
        UPDATE public.meter_logs m
        SET raw_image_url = 'purged_due_to_retention'
        FROM eligible_logs e
        WHERE m.log_id = e.log_id
        RETURNING m.timestamp
    )
    SELECT 
        COUNT(*),
        MIN(timestamp),
        MAX(timestamp)
    INTO 
        v_purged_count,
        v_min_ts,
        v_max_ts
    FROM updated_rows;

    RETURN QUERY SELECT v_purged_count, v_min_ts, v_max_ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. SUPABASE STORAGE BUCKET CREATION (Run in Supabase SQL editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('meter-photos', 'meter-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: Allow authenticated and anonymous operator uploads
CREATE POLICY "Allow public read of meter photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'meter-photos');

CREATE POLICY "Allow operators to upload meter photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'meter-photos');

CREATE POLICY "Allow admin cleanup of meter photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'meter-photos');

-- 8. ROW LEVEL SECURITY (RLS) FOR TABLES
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to vehicles"
ON public.vehicles FOR SELECT USING (true);

CREATE POLICY "Allow public insert and update to vehicles"
ON public.vehicles FOR ALL USING (true);

CREATE POLICY "Allow public read access to operators"
ON public.operators FOR SELECT USING (true);

CREATE POLICY "Allow public insert and update to operators"
ON public.operators FOR ALL USING (true);

CREATE POLICY "Allow public read access to meter_logs"
ON public.meter_logs FOR SELECT USING (true);

CREATE POLICY "Allow public insert to meter_logs"
ON public.meter_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to meter_logs"
ON public.meter_logs FOR UPDATE USING (true);
