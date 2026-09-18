import React from 'react';
import { Truck, Users, FileText, AlertTriangle, Gauge, Clock, HardDrive, QrCode, Upload, ArrowUpRight } from 'lucide-react';
import { Vehicle, Operator, MeterLog, StorageStats } from '../../types';

interface DashboardOverviewProps {
  vehicles: Vehicle[];
  operators: Operator[];
  logs: MeterLog[];
  storageStats: StorageStats;
  onNavigateTab: (tab: 'logs' | 'vehicles' | 'operators' | 'qr' | 'storage') => void;
  onOpenScan: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  vehicles,
  operators,
  logs,
  storageStats,
  onNavigateTab,
  onOpenScan
}) => {
  // Compute analytics
  const activeVehicles = vehicles.filter(v => v.status === 'Active').length;
  const activeOperators = operators.filter(o => o.status === 'Active').length;
  
  // Today's logs
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter(l => new Date(l.timestamp).getTime() >= todayStart.getTime());
  
  // Anomalies
  const flaggedCount = logs.filter(l => l.flagged_status).length;

  // Total delta metrics
  let totalKmDelta = 0;
  let totalHoursDelta = 0;

  for (const log of logs) {
    if (log.vehicle?.reading_type === 'KM') {
      totalKmDelta += Math.max(0, log.reading_difference);
    } else if (log.vehicle?.reading_type === 'HOURS') {
      totalHoursDelta += Math.max(0, log.reading_difference);
    }
  }

  return (
    <div className="space-y-6">
      {/* Fleet Hero Banner */}
      <div className="bg-gradient-to-r from-industrial-900 via-industrial-850 to-industrial-900 border border-industrial-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-hazard-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-hazard-400 uppercase tracking-widest">
                Fleet Operations Control
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-display">
              Fleet Odometer & Meter Command
            </h1>
            <p className="text-xs sm:text-sm text-industrial-400 max-w-2xl mt-1">
              Real-time shift log auditing, QR sticker generation, OCR verification, and 60-day auto-purge storage management.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onOpenScan}
              className="px-4 py-2.5 rounded-xl bg-hazard-500 hover:bg-hazard-400 text-industrial-950 font-bold text-xs flex items-center space-x-2 transition shadow-lg shadow-hazard-500/20 active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Log Reading (Mobile)</span>
            </button>
            <button
              onClick={() => onNavigateTab('qr')}
              className="px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-slate-200 font-semibold text-xs flex items-center space-x-2 transition"
            >
              <QrCode className="w-4 h-4 text-hazard-400" />
              <span>Print QR Stickers</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Machines */}
        <div 
          onClick={() => onNavigateTab('vehicles')}
          className="bg-industrial-900 border border-industrial-800 hover:border-hazard-500/50 rounded-2xl p-4 transition shadow-lg cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-industrial-400">Active Fleet</span>
            <div className="w-8 h-8 rounded-lg bg-hazard-500/10 text-hazard-400 flex items-center justify-center group-hover:bg-hazard-500 group-hover:text-industrial-950 transition">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {activeVehicles} <span className="text-xs font-normal text-industrial-400">/ {vehicles.length}</span>
          </div>
          <p className="text-[11px] text-industrial-400 mt-1">Equipment & Trucks</p>
        </div>

        {/* Today's Submissions */}
        <div 
          onClick={() => onNavigateTab('logs')}
          className="bg-industrial-900 border border-industrial-800 hover:border-emerald-500/50 rounded-2xl p-4 transition shadow-lg cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-industrial-400">Today's Logs</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-industrial-950 transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {todayLogs.length}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 font-mono">{logs.length} total logged</p>
        </div>

        {/* Flagged Anomalies */}
        <div 
          onClick={() => onNavigateTab('logs')}
          className="bg-industrial-900 border border-industrial-800 hover:border-red-500/50 rounded-2xl p-4 transition shadow-lg cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-industrial-400">Flagged Anomalies</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {flaggedCount}
          </div>
          <p className="text-[11px] text-industrial-400 mt-1">Requiring supervisor check</p>
        </div>

        {/* Storage Retention Status */}
        <div 
          onClick={() => onNavigateTab('storage')}
          className="bg-industrial-900 border border-industrial-800 hover:border-blue-500/50 rounded-2xl p-4 transition shadow-lg cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-industrial-400">Photo Retention</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {storageStats.totalImages} <span className="text-xs font-normal text-industrial-400">photos</span>
          </div>
          <p className="text-[11px] text-blue-400 mt-1 font-mono">
            {storageStats.purgedImages} purged (60-day policy)
          </p>
        </div>
      </div>

      {/* Fleet Meter Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800 text-blue-400 flex items-center justify-center">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase text-industrial-400 font-bold">
                Cumulative Fleet Travel
              </span>
              <div className="text-2xl font-mono font-black text-slate-100 mt-0.5">
                {Math.round(totalKmDelta).toLocaleString()} <span className="text-sm font-semibold text-blue-400">KM</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('logs')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
          >
            <span>View Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase text-industrial-400 font-bold">
                Cumulative Equipment Run Time
              </span>
              <div className="text-2xl font-mono font-black text-slate-100 mt-0.5">
                {totalHoursDelta.toFixed(1)} <span className="text-sm font-semibold text-amber-400">HOURS</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('logs')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
          >
            <span>View Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
