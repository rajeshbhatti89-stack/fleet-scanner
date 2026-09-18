import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Truck, Users, FileText, Printer, HardDrive, RefreshCw } from 'lucide-react';
import { Vehicle, Operator, MeterLog, StorageStats } from '../../types';
import { getVehicles, getOperators, getMeterLogs, getStorageStats } from '../../lib/storage';
import { DashboardOverview } from './DashboardOverview';
import { VehiclesManager } from './VehiclesManager';
import { OperatorsManager } from './OperatorsManager';
import { LogsTable } from './LogsTable';
import { QrPrintSheet } from './QrPrintSheet';
import { StorageRetentionManager } from './StorageRetentionManager';

interface AdminDashboardProps {
  onOpenScan: () => void;
  initialTab?: 'overview' | 'vehicles' | 'operators' | 'logs' | 'qr' | 'storage';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenScan,
  initialTab = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'operators' | 'logs' | 'qr' | 'storage'>(initialTab);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [logs, setLogs] = useState<MeterLog[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalImages: 0,
    purgedImages: 0,
    estimatedStorageBytes: 0,
    retentionDays: 60,
    capacityWatermarkPct: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrintVehicleId, setSelectedPrintVehicleId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [vData, oData, lData, sData] = await Promise.all([
        getVehicles(),
        getOperators(),
        getMeterLogs(),
        getStorageStats()
      ]);
      setVehicles(vData);
      setOperators(oData);
      setLogs(lData);
      setStorageStats(sData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintSingleVehicle = (v: Vehicle) => {
    setSelectedPrintVehicleId(v.vehicle_id);
    setActiveTab('qr');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Sub-navigation Tabs (Hidden during print) */}
      <div className="no-print flex items-center justify-between border-b border-industrial-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-full">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-hazard-500 text-industrial-950 font-bold shadow-md shadow-hazard-500/20'
                : 'text-industrial-400 hover:text-slate-200 hover:bg-industrial-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'logs'
                ? 'bg-hazard-500 text-industrial-950 font-bold shadow-md shadow-hazard-500/20'
                : 'text-industrial-400 hover:text-slate-200 hover:bg-industrial-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Shift Logs</span>
            <span className="px-1.5 py-0.2 rounded-full bg-industrial-950/40 text-[10px] font-mono">
              {logs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'vehicles'
                ? 'bg-hazard-500 text-industrial-950 font-bold shadow-md shadow-hazard-500/20'
                : 'text-industrial-400 hover:text-slate-200 hover:bg-industrial-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Fleet Vehicles</span>
            <span className="px-1.5 py-0.2 rounded-full bg-industrial-950/40 text-[10px] font-mono">
              {vehicles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('operators')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'operators'
                ? 'bg-hazard-500 text-industrial-950 font-bold shadow-md shadow-hazard-500/20'
                : 'text-industrial-400 hover:text-slate-200 hover:bg-industrial-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Operators</span>
            <span className="px-1.5 py-0.2 rounded-full bg-industrial-950/40 text-[10px] font-mono">
              {operators.length}
            </span>
          </button>

          <button
            onClick={() => {
              setSelectedPrintVehicleId(null);
              setActiveTab('qr');
            }}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'qr'
                ? 'bg-hazard-500 text-industrial-950 font-bold shadow-md shadow-hazard-500/20'
                : 'text-industrial-400 hover:text-slate-200 hover:bg-industrial-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>QR Stickers</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'storage'
                ? 'bg-hazard-500 text-industrial-950 font-bold shadow-md shadow-hazard-500/20'
                : 'text-industrial-400 hover:text-slate-200 hover:bg-industrial-900'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Storage & Purge</span>
          </button>
        </div>

        {/* Refresh Button */}
        <button
          onClick={loadAllData}
          disabled={isLoading}
          className="p-2 rounded-xl bg-industrial-900 hover:bg-industrial-800 text-industrial-400 hover:text-slate-200 border border-industrial-800 transition"
          title="Refresh All Fleet Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-hazard-500' : ''}`} />
        </button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="py-24 text-center text-industrial-400 text-xs flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-hazard-500" />
          <span>Synchronizing Fleet Command...</span>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <DashboardOverview
              vehicles={vehicles}
              operators={operators}
              logs={logs}
              storageStats={storageStats}
              onNavigateTab={(t) => setActiveTab(t)}
              onOpenScan={onOpenScan}
            />
          )}

          {activeTab === 'vehicles' && (
            <VehiclesManager
              vehicles={vehicles}
              onRefresh={loadAllData}
              onPrintQr={handlePrintSingleVehicle}
            />
          )}

          {activeTab === 'operators' && (
            <OperatorsManager
              operators={operators}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTable
              logs={logs}
              vehicles={vehicles}
              operators={operators}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'qr' && (
            <QrPrintSheet
              vehicles={vehicles}
              preSelectedVehicleId={selectedPrintVehicleId}
              onBack={() => setActiveTab('vehicles')}
            />
          )}

          {activeTab === 'storage' && (
            <StorageRetentionManager
              storageStats={storageStats}
              logs={logs}
              onRefresh={loadAllData}
            />
          )}
        </>
      )}
    </div>
  );
};
