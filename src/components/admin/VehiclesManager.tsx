import React, { useState, useRef } from 'react';
import { Truck, Plus, Upload, Download, Edit2, CheckCircle2, XCircle, Search, QrCode, AlertCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Vehicle, ReadingType, VehicleStatus } from '../../types';
import { saveVehicle, bulkUpsertVehicles } from '../../lib/storage';
import { downloadVehicleTemplate, parseVehiclesCsv } from '../../lib/csvHelper';

interface VehiclesManagerProps {
  vehicles: Vehicle[];
  onRefresh: () => void;
  onPrintQr: (vehicle: Vehicle) => void;
}

export const VehiclesManager: React.FC<VehiclesManagerProps> = ({
  vehicles,
  onRefresh,
  onPrintQr
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  
  // Single vehicle modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<{
    vehicle_id: string;
    machine_name: string;
    reading_type: ReadingType;
    last_known_reading: number;
    status: VehicleStatus;
  }>({
    vehicle_id: '',
    machine_name: '',
    reading_type: 'HOURS',
    last_known_reading: 0,
    status: 'Active'
  });

  // Bulk Upload modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Vehicle[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      vehicle_id: '',
      machine_name: '',
      reading_type: 'HOURS',
      last_known_reading: 0,
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_id: vehicle.vehicle_id,
      machine_name: vehicle.machine_name,
      reading_type: vehicle.reading_type,
      last_known_reading: vehicle.last_known_reading,
      status: vehicle.status
    });
    setIsModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_id.trim() || !formData.machine_name.trim()) return;

    const qr_code_token = editingVehicle
      ? editingVehicle.qr_code_token
      : `qr-${formData.vehicle_id.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;

    await saveVehicle({
      vehicle_id: formData.vehicle_id.trim(),
      machine_name: formData.machine_name.trim(),
      reading_type: formData.reading_type,
      last_known_reading: Number(formData.last_known_reading) || 0,
      status: formData.status,
      qr_code_token
    });

    setIsModalOpen(false);
    onRefresh();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { vehicles: parsed, errors } = parseVehiclesCsv(text);
      setParsedPreview(parsed);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleConfirmBulkImport = async () => {
    if (parsedPreview.length === 0) return;
    setIsImporting(true);
    await bulkUpsertVehicles(parsedPreview);
    setIsImporting(false);
    setIsBulkOpen(false);
    setBulkFile(null);
    setParsedPreview([]);
    setParseErrors([]);
    onRefresh();
  };

  const filtered = vehicles.filter(v => {
    const matchesSearch =
      v.vehicle_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.machine_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-display flex items-center space-x-2">
            <Truck className="w-5 h-5 text-hazard-500" />
            <span>Fleet Equipment & Vehicles</span>
          </h2>
          <p className="text-xs text-industrial-400">
            Manage machines, reading metrics (KM/Hours), and QR verification tokens.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5 text-hazard-400" />
            <span>Bulk CSV</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-hazard-500 hover:bg-hazard-400 text-industrial-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-lg shadow-hazard-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-industrial-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID or machine name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-industrial-900 border border-industrial-800 text-slate-200 placeholder-industrial-500 focus:outline-none focus:border-hazard-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-industrial-400">Status:</span>
          {(['ALL', 'Active', 'Inactive'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-industrial-700 text-slate-100 border border-industrial-600'
                  : 'text-industrial-400 hover:text-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-industrial-950 text-[11px] font-mono uppercase text-industrial-400 border-b border-industrial-800">
              <tr>
                <th className="py-3 px-4">Vehicle ID</th>
                <th className="py-3 px-4">Machine Name</th>
                <th className="py-3 px-4">Metric</th>
                <th className="py-3 px-4">Last Recorded Reading</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-industrial-500 text-xs">
                    No vehicles found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map(v => (
                  <tr key={v.vehicle_id} className="hover:bg-industrial-850/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-hazard-400">
                      {v.vehicle_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {v.machine_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        v.reading_type === 'KM'
                          ? 'bg-blue-950/70 text-blue-400 border border-blue-800'
                          : 'bg-amber-950/70 text-amber-400 border border-amber-800'
                      }`}>
                        {v.reading_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-100 font-bold">
                      {v.last_known_reading.toLocaleString()} <span className="text-industrial-400 font-normal text-[11px]">{v.reading_type}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 text-[11px] font-semibold ${
                        v.status === 'Active' ? 'text-emerald-400' : 'text-industrial-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          v.status === 'Active' ? 'bg-emerald-400' : 'bg-industrial-600'
                        }`} />
                        <span>{v.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onPrintQr(v)}
                        className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-hazard-400 hover:text-hazard-300 transition"
                        title="Print QR Sticker"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(v)}
                        className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-slate-300 hover:text-white transition"
                        title="Edit Vehicle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SINGLE VEHICLE ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 font-display mb-4">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Machine'}
            </h3>

            <form onSubmit={handleSaveVehicle} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-industrial-400 font-semibold mb-1">
                  Vehicle ID / Plate / Asset Tag *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingVehicle}
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value.toUpperCase() })}
                  placeholder="e.g. JCB-05, TIP-2830"
                  className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 font-mono focus:outline-none focus:border-hazard-500"
                />
              </div>

              <div>
                <label className="block text-industrial-400 font-semibold mb-1">
                  Machine Model / Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.machine_name}
                  onChange={(e) => setFormData({ ...formData, machine_name: e.target.value })}
                  placeholder="e.g. JCB 3DX Eco Backhoe Loader"
                  className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 focus:outline-none focus:border-hazard-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-industrial-400 font-semibold mb-1">
                    Reading Metric *
                  </label>
                  <select
                    value={formData.reading_type}
                    onChange={(e) => setFormData({ ...formData, reading_type: e.target.value as ReadingType })}
                    className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 focus:outline-none focus:border-hazard-500 font-mono"
                  >
                    <option value="HOURS">HOURS (Engine Run Time)</option>
                    <option value="KM">KM (Odometer Distance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-industrial-400 font-semibold mb-1">
                    Initial / Current Reading
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.last_known_reading}
                    onChange={(e) => setFormData({ ...formData, last_known_reading: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 font-mono focus:outline-none focus:border-hazard-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-industrial-400 font-semibold mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                  className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 focus:outline-none focus:border-hazard-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive / Maintenance</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-industrial-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-industrial-800 text-slate-300 font-semibold hover:bg-industrial-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-hazard-500 hover:bg-hazard-400 text-industrial-950 font-bold transition shadow-lg shadow-hazard-500/20"
                >
                  {editingVehicle ? 'Save Changes' : 'Create Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CSV UPLOAD MODAL */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-2xl w-full max-w-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-100 font-display flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-hazard-500" />
                <span>Bulk Import Vehicles (CSV / Excel)</span>
              </h3>
              <button
                onClick={downloadVehicleTemplate}
                className="text-xs text-hazard-400 hover:text-hazard-300 font-semibold flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            <p className="text-xs text-industrial-400 mb-4">
              Upload a CSV file containing columns: <code>Vehicle ID</code>, <code>Machine Name</code>, <code>Reading Type (KM/HOURS)</code>, <code>Initial Reading</code>, and <code>Status</code>.
            </p>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-industrial-700 hover:border-hazard-500 rounded-xl p-6 text-center cursor-pointer transition bg-industrial-950/60"
            >
              <Upload className="w-8 h-8 text-hazard-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">
                {bulkFile ? bulkFile.name : 'Click to select or drag & drop CSV file'}
              </p>
              <p className="text-[11px] text-industrial-500 mt-0.5">Supports .csv files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs space-y-1 max-h-24 overflow-y-auto">
                <div className="font-bold flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Validation Notices ({parseErrors.length})</span>
                </div>
                {parseErrors.map((err, idx) => (
                  <p key={idx} className="text-[11px] font-mono">{err}</p>
                ))}
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedPreview.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-300">
                    Preview: Ready to import {parsedPreview.length} vehicle(s)
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-industrial-800 bg-industrial-950">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-industrial-900 font-mono text-industrial-400">
                      <tr>
                        <th className="py-1.5 px-2">ID</th>
                        <th className="py-1.5 px-2">Name</th>
                        <th className="py-1.5 px-2">Unit</th>
                        <th className="py-1.5 px-2">Reading</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-800">
                      {parsedPreview.map((pv, i) => (
                        <tr key={i}>
                          <td className="py-1.5 px-2 font-mono text-hazard-400">{pv.vehicle_id}</td>
                          <td className="py-1.5 px-2">{pv.machine_name}</td>
                          <td className="py-1.5 px-2 font-mono">{pv.reading_type}</td>
                          <td className="py-1.5 px-2 font-mono">{pv.last_known_reading}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-industrial-800 mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsBulkOpen(false);
                  setParsedPreview([]);
                  setBulkFile(null);
                }}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-slate-300 font-semibold hover:bg-industrial-700 text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedPreview.length === 0 || isImporting}
                onClick={handleConfirmBulkImport}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  parsedPreview.length > 0 && !isImporting
                    ? 'bg-hazard-500 hover:bg-hazard-400 text-industrial-950 shadow-lg shadow-hazard-500/20'
                    : 'bg-industrial-800 text-industrial-500 cursor-not-allowed'
                }`}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Import ({parsedPreview.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
