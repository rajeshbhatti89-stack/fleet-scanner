import React, { useState } from 'react';
import { FileText, Download, Filter, Search, AlertTriangle, CheckCircle2, Calendar, Eye, RefreshCw, HardDrive } from 'lucide-react';
import { MeterLog, Vehicle, Operator } from '../../types';
import { exportMeterLogsToCsv } from '../../lib/csvHelper';
import { LogDetailModal } from './LogDetailModal';

interface LogsTableProps {
  logs: MeterLog[];
  vehicles: Vehicle[];
  operators: Operator[];
  onRefresh: () => void;
}

export const LogsTable: React.FC<LogsTableProps> = ({
  logs,
  vehicles,
  operators,
  onRefresh
}) => {
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  // Selected Log for inspection modal
  const [inspectingLog, setInspectingLog] = useState<MeterLog | null>(null);

  // Filter in memory
  const filtered = logs.filter(log => {
    if (selectedVehicle && log.vehicle_id !== selectedVehicle) return false;
    if (selectedOperator && log.operator_id !== selectedOperator) return false;
    if (flaggedOnly && !log.flagged_status) return false;
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      if (new Date(log.timestamp).getTime() < fromTime) return false;
    }
    if (dateTo) {
      const toTime = new Date(dateTo).setHours(23, 59, 59, 999);
      if (new Date(log.timestamp).getTime() > toTime) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedVehicle('');
    setSelectedOperator('');
    setFlaggedOnly(false);
  };

  const hasActiveFilters = dateFrom || dateTo || selectedVehicle || selectedOperator || flaggedOnly;

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-display flex items-center space-x-2">
            <FileText className="w-5 h-5 text-hazard-500" />
            <span>Fleet Daily Shift Logs</span>
          </h2>
          <p className="text-xs text-industrial-400">
            Audit meter readings, inspect captured photos, and review anomaly flags.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => exportMeterLogsToCsv(filtered)}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-hazard-500 hover:bg-hazard-400 text-industrial-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-lg shadow-hazard-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV ({filtered.length})</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
            <Filter className="w-3.5 h-3.5 text-hazard-500" />
            <span>Filter Shift Logs</span>
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-hazard-400 hover:text-hazard-300 font-normal text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Date From */}
          <div>
            <label className="text-[10px] text-industrial-400 font-mono block mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-200 focus:outline-none focus:border-hazard-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-[10px] text-industrial-400 font-mono block mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-200 focus:outline-none focus:border-hazard-500"
            />
          </div>

          {/* Vehicle Dropdown */}
          <div>
            <label className="text-[10px] text-industrial-400 font-mono block mb-1">Vehicle</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-200 focus:outline-none focus:border-hazard-500 font-mono"
            >
              <option value="">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.vehicle_id} - {v.machine_name.substring(0, 20)}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Dropdown */}
          <div>
            <label className="text-[10px] text-industrial-400 font-mono block mb-1">Operator</label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-200 focus:outline-none focus:border-hazard-500"
            >
              <option value="">All Operators</option>
              {operators.map(op => (
                <option key={op.operator_id} value={op.operator_id}>
                  {op.operator_name}
                </option>
              ))}
            </select>
          </div>

          {/* Flagged Anomaly Checkbox */}
          <div className="flex items-end pb-1">
            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-xl bg-industrial-950 border border-industrial-700 w-full hover:border-hazard-500/60 transition">
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={(e) => setFlaggedOnly(e.target.checked)}
                className="w-4 h-4 rounded border-hazard-500 text-hazard-500 focus:ring-0 bg-industrial-900"
              />
              <span className="text-[11px] font-semibold text-slate-200 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Anomalies Only</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* LOGS AUDIT TABLE */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-industrial-950 text-[11px] font-mono uppercase text-industrial-400 border-b border-industrial-800">
              <tr>
                <th className="py-3 px-3">Date / Time</th>
                <th className="py-3 px-3">Machine & Unit</th>
                <th className="py-3 px-3">Operator</th>
                <th className="py-3 px-3 text-right">Previous</th>
                <th className="py-3 px-3 text-right">New Reading</th>
                <th className="py-3 px-3 text-right">Run Delta</th>
                <th className="py-3 px-3 text-center">Photo</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-industrial-500 text-xs">
                    No meter logs found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(log => {
                  const isPurged = log.raw_image_url === 'purged_due_to_retention';
                  return (
                    <tr key={log.log_id} className="hover:bg-industrial-850/50 transition">
                      
                      {/* Date & Time */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <div className="text-slate-200 font-semibold">
                          {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-industrial-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Machine */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-hazard-400">
                          {log.vehicle_id}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate max-w-[150px]">
                          {log.vehicle?.machine_name || 'Machine'}
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200">
                          {log.operator?.operator_name || log.operator_id}
                        </div>
                        <div className="text-[10px] font-mono text-industrial-400">
                          {log.operator_id}
                        </div>
                      </td>

                      {/* Previous */}
                      <td className="py-3 px-3 text-right font-mono text-industrial-400">
                        {log.previous_reading.toLocaleString()}
                      </td>

                      {/* Confirmed Reading */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-100">
                        {log.confirmed_reading.toLocaleString()}
                      </td>

                      {/* Run Delta */}
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          log.reading_difference < 0
                            ? 'bg-red-950/60 text-red-400 border border-red-800'
                            : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        }`}>
                          +{log.reading_difference.toLocaleString()} {log.vehicle?.reading_type}
                        </span>
                      </td>

                      {/* Photo Thumbnail with Zoom Click */}
                      <td className="py-3 px-3 text-center">
                        {isPurged ? (
                          <div 
                            onClick={() => setInspectingLog(log)}
                            className="w-10 h-10 rounded-lg bg-blue-950/60 border border-blue-800 text-blue-400 flex items-center justify-center mx-auto cursor-pointer hover:border-blue-400 transition"
                            title="Image file purged per 60-day policy (audit retained)"
                          >
                            <HardDrive className="w-4 h-4" />
                          </div>
                        ) : log.raw_image_url ? (
                          <div
                            onClick={() => setInspectingLog(log)}
                            className="w-10 h-10 rounded-lg overflow-hidden bg-black border border-industrial-700 hover:border-hazard-500 mx-auto cursor-pointer transition shadow group relative"
                            title="Click to zoom inspect"
                          >
                            <img
                              src={log.raw_image_url}
                              alt="Thumbnail"
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-industrial-500">None</span>
                        )}
                      </td>

                      {/* Status / Anomaly */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {log.flagged_status ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/70 border border-red-800 text-red-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span>ANOMALY</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 border border-emerald-800 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>VERIFIED</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setInspectingLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-slate-300 hover:text-white transition text-xs font-semibold"
                        >
                          Audit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT / EDIT MODAL */}
      {inspectingLog && (
        <LogDetailModal
          log={inspectingLog}
          onClose={() => setInspectingLog(null)}
          onLogUpdated={(updated) => {
            setInspectingLog(updated);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
