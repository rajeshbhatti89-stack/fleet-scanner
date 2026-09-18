import React, { useState } from 'react';
import { HardDrive, ShieldCheck, Trash2, AlertTriangle, RefreshCw, CheckCircle2, Clock, Server, Code } from 'lucide-react';
import { StorageStats, MeterLog } from '../../types';
import { executeRetentionPurge } from '../../lib/storage';

interface StorageRetentionManagerProps {
  storageStats: StorageStats;
  logs: MeterLog[];
  onRefresh: () => void;
}

export const StorageRetentionManager: React.FC<StorageRetentionManagerProps> = ({
  storageStats,
  logs,
  onRefresh
}) => {
  const [retentionDays, setRetentionDays] = useState(60);
  const [isRunningPurge, setIsRunningPurge] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ count: number; msg: string } | null>(null);

  const handleTriggerPurge = async (forceOldest = false) => {
    setIsRunningPurge(true);
    setPurgeResult(null);

    const res = await executeRetentionPurge(retentionDays, forceOldest);
    setIsRunningPurge(false);
    setPurgeResult({
      count: res.purgedCount,
      msg: res.message
    });
    onRefresh();
  };

  const purgedLogs = logs.filter(l => l.raw_image_url === 'purged_due_to_retention');
  const activeLogsWithPhotos = logs.filter(l => l.raw_image_url && l.raw_image_url !== 'purged_due_to_retention');

  // Capacity calculation
  const capacityPct = storageStats.capacityWatermarkPct;
  const isNearThreshold = capacityPct >= 80;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-blue-950/70 border border-blue-800 text-blue-400 flex items-center justify-center">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 font-display flex items-center space-x-2">
                <span>Storage Management & 60-Day Auto-Purge</span>
              </h2>
              <p className="text-xs text-industrial-400">
                Automated photo cleanup routine for Supabase Storage with permanent database audit integrity.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleTriggerPurge(false)}
            disabled={isRunningPurge}
            className="px-4 py-2.5 rounded-xl bg-hazard-500 hover:bg-hazard-400 active:scale-95 text-industrial-950 font-bold text-xs flex items-center space-x-2 transition shadow-lg shadow-hazard-500/20"
          >
            {isRunningPurge ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Cleanup...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Run Retention Purge Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Message */}
      {purgeResult && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{purgeResult.msg}</span>
          </div>
          <span className="font-mono font-bold bg-emerald-900/60 px-2 py-0.5 rounded">
            {purgeResult.count} Cleaned
          </span>
        </div>
      )}

      {/* Storage Capacity Bar with 80% Watermark Line */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Bucket Storage Capacity Meter
            </span>
            <p className="text-[11px] text-industrial-400 mt-0.5">
              Target: bucket <code className="text-hazard-400">meter-photos</code> (Purges oldest images when exceeding 80% watermark)
            </p>
          </div>
          <span className="text-sm font-mono font-bold text-slate-100">
            {capacityPct}% <span className="text-xs text-industrial-400 font-normal">Capacity</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative w-full bg-industrial-950 rounded-full h-4 border border-industrial-700 overflow-hidden">
          {/* 80% Watermark line */}
          <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-hazard-500 z-10" title="80% Watermark Trigger" />
          
          <div
            className={`h-full transition-all duration-500 ${
              isNearThreshold
                ? 'bg-gradient-to-r from-hazard-500 to-red-500'
                : 'bg-gradient-to-r from-blue-500 to-emerald-400'
            }`}
            style={{ width: `${Math.min(100, capacityPct)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-industrial-400 font-mono">
          <span>0%</span>
          <span className="text-hazard-400 font-semibold">▲ 80% Auto-Purge Trigger Mark</span>
          <span>100%</span>
        </div>

        {isNearThreshold && (
          <div className="p-3 rounded-xl bg-amber-950/50 border border-hazard-500 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-hazard-400 flex-shrink-0" />
              <span>Storage capacity is at or above 80%. High priority auto-purge recommended.</span>
            </div>
            <button
              onClick={() => handleTriggerPurge(true)}
              className="px-3 py-1 rounded-lg bg-hazard-500 text-industrial-950 font-bold text-xs hover:bg-hazard-400"
            >
              Purge Oldest Images
            </button>
          </div>
        )}
      </div>

      {/* Retention Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Photos */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow">
          <span className="text-xs text-industrial-400 font-semibold block">Active Storage Photos</span>
          <div className="text-2xl font-mono font-black text-slate-100 mt-1">
            {activeLogsWithPhotos.length}
          </div>
          <p className="text-[11px] text-industrial-500 mt-1 font-mono">
            ~{Math.round(storageStats.estimatedStorageBytes / 1024)} KB stored
          </p>
        </div>

        {/* Purged Photos */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow">
          <span className="text-xs text-industrial-400 font-semibold block">Photos Purged (Retained in DB)</span>
          <div className="text-2xl font-mono font-black text-blue-400 mt-1">
            {purgedLogs.length}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 font-mono">
            Audit logs & readings 100% preserved
          </p>
        </div>

        {/* Configured Threshold */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow">
          <span className="text-xs text-industrial-400 font-semibold block">Retention Horizon</span>
          <div className="text-2xl font-mono font-black text-hazard-400 mt-1">
            {retentionDays} Days
          </div>
          <p className="text-[11px] text-industrial-500 mt-1">
            Images &gt; {retentionDays} days removed
          </p>
        </div>
      </div>

      {/* DATA INTEGRITY POLICY EXPLANATION */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider font-mono">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero-Data-Loss Integrity Guarantee</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          When an odometer/meter photo is purged:
        </p>

        <ul className="space-y-1.5 text-xs text-industrial-300 list-disc list-inside">
          <li>The physical JPEG file is deleted from Supabase Storage bucket <code>meter-photos</code> to reclaim space.</li>
          <li>The database record in <code>meter_logs</code> is <strong>retained permanently</strong>: Timestamp, Vehicle ID, Operator Code, Confirmed Reading, Shift Delta, and GPS Coordinates remain unaltered for legal compliance and fleet tax auditing.</li>
          <li>The <code>raw_image_url</code> field is set to <code>"purged_due_to_retention"</code> so inspection tables display a clean retention audit marker.</li>
        </ul>
      </div>

      {/* SUPABASE CRON & EDGE FUNCTION IMPLEMENTATION GUIDE */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center space-x-2 text-slate-200 font-bold text-xs uppercase tracking-wider font-mono">
          <Server className="w-4 h-4 text-hazard-500" />
          <span>Automated Cloud Cron / Edge Function Setup</span>
        </div>

        <p className="text-xs text-industrial-400">
          We have generated the turnkey Supabase Edge Function in <code>supabase/functions/purge-old-photos/index.ts</code>. You can schedule it with:
        </p>

        <div className="p-3 rounded-xl bg-industrial-950 border border-industrial-800 font-mono text-[11px] text-hazard-400 overflow-x-auto">
          # 1. Deploy the Edge Function to your Supabase project<br />
          supabase functions deploy purge-old-photos<br /><br />
          # 2. Or schedule in Supabase SQL editor using pg_cron (runs nightly at 2:00 AM UTC):<br />
          SELECT cron.schedule('daily-meter-photo-purge', '0 2 * * *', $$<br />
          &nbsp;&nbsp;SELECT * FROM public.purge_meter_photos_retention(60, 500);<br />
          $$);
        </div>
      </div>
    </div>
  );
};
