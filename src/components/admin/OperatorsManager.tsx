import React, { useState, useRef } from 'react';
import { Users, Plus, Upload, Download, Edit2, Search, AlertCircle, FileSpreadsheet, CheckCircle2, RefreshCw } from 'lucide-react';
import { Operator, OperatorStatus } from '../../types';
import { saveOperator, bulkUpsertOperators } from '../../lib/storage';
import { downloadOperatorTemplate, parseOperatorsCsv } from '../../lib/csvHelper';

interface OperatorsManagerProps {
  operators: Operator[];
  onRefresh: () => void;
}

export const OperatorsManager: React.FC<OperatorsManagerProps> = ({ operators, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');

  // Single Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [formData, setFormData] = useState<{
    operator_id: string;
    operator_name: string;
    phone_number: string;
    status: OperatorStatus;
  }>({
    operator_id: '',
    operator_name: '',
    phone_number: '',
    status: 'Active'
  });

  // Bulk Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Operator[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openAddModal = () => {
    setEditingOperator(null);
    setFormData({
      operator_id: '',
      operator_name: '',
      phone_number: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (op: Operator) => {
    setEditingOperator(op);
    setFormData({
      operator_id: op.operator_id,
      operator_name: op.operator_name,
      phone_number: op.phone_number || '',
      status: op.status
    });
    setIsModalOpen(true);
  };

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.operator_id.trim() || !formData.operator_name.trim()) return;

    await saveOperator({
      operator_id: formData.operator_id.trim(),
      operator_name: formData.operator_name.trim(),
      phone_number: formData.phone_number.trim() || undefined,
      status: formData.status
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
      const { operators: parsed, errors } = parseOperatorsCsv(text);
      setParsedPreview(parsed);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleConfirmBulkImport = async () => {
    if (parsedPreview.length === 0) return;
    setIsImporting(true);
    await bulkUpsertOperators(parsedPreview);
    setIsImporting(false);
    setIsBulkOpen(false);
    setBulkFile(null);
    setParsedPreview([]);
    setParseErrors([]);
    onRefresh();
  };

  const filtered = operators.filter(o => {
    const matchesSearch =
      o.operator_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.operator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.phone_number && o.phone_number.includes(searchTerm));
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-100 font-display flex items-center space-x-2">
            <Users className="w-5 h-5 text-hazard-500" />
            <span>Operator & Driver Roster</span>
          </h2>
          <p className="text-xs text-industrial-400">
            Manage authorized machine operators, employee codes, and phone contacts.
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
            <span>Add Operator</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-industrial-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search operator name or code..."
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

      {/* Operators Table */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-industrial-950 text-[11px] font-mono uppercase text-industrial-400 border-b border-industrial-800">
              <tr>
                <th className="py-3 px-4">Operator Code</th>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Phone Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-industrial-500 text-xs">
                    No operators found matching search filters.
                  </td>
                </tr>
              ) : (
                filtered.map(op => (
                  <tr key={op.operator_id} className="hover:bg-industrial-850/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-hazard-400">
                      {op.operator_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {op.operator_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-industrial-300">
                      {op.phone_number || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 text-[11px] font-semibold ${
                        op.status === 'Active' ? 'text-emerald-400' : 'text-industrial-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          op.status === 'Active' ? 'bg-emerald-400' : 'bg-industrial-600'
                        }`} />
                        <span>{op.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(op)}
                        className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-slate-300 hover:text-white transition"
                        title="Edit Operator"
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

      {/* SINGLE OPERATOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 font-display mb-4">
              {editingOperator ? 'Edit Operator' : 'Add New Operator'}
            </h3>

            <form onSubmit={handleSaveOperator} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-industrial-400 font-semibold mb-1">
                  Operator ID / Employee Code *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingOperator}
                  value={formData.operator_id}
                  onChange={(e) => setFormData({ ...formData, operator_id: e.target.value.toUpperCase() })}
                  placeholder="e.g. OP-1010"
                  className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 font-mono focus:outline-none focus:border-hazard-500"
                />
              </div>

              <div>
                <label className="block text-industrial-400 font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.operator_name}
                  onChange={(e) => setFormData({ ...formData, operator_name: e.target.value })}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 focus:outline-none focus:border-hazard-500"
                />
              </div>

              <div>
                <label className="block text-industrial-400 font-semibold mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 font-mono focus:outline-none focus:border-hazard-500"
                />
              </div>

              <div>
                <label className="block text-industrial-400 font-semibold mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as OperatorStatus })}
                  className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 focus:outline-none focus:border-hazard-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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
                  {editingOperator ? 'Save Changes' : 'Create Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK OPERATORS CSV MODAL */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-2xl w-full max-w-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-100 font-display flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-hazard-500" />
                <span>Bulk Import Operators (CSV / Excel)</span>
              </h3>
              <button
                onClick={downloadOperatorTemplate}
                className="text-xs text-hazard-400 hover:text-hazard-300 font-semibold flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            <p className="text-xs text-industrial-400 mb-4">
              Upload a CSV with columns: <code>Operator ID</code>, <code>Operator Name</code>, <code>Phone Number</code>, and <code>Status</code>.
            </p>

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

            {parsedPreview.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-300 mb-1.5">
                  Preview: Ready to import {parsedPreview.length} operator(s)
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-industrial-800 bg-industrial-950">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-industrial-900 font-mono text-industrial-400">
                      <tr>
                        <th className="py-1.5 px-2">Code</th>
                        <th className="py-1.5 px-2">Name</th>
                        <th className="py-1.5 px-2">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-800">
                      {parsedPreview.map((po, i) => (
                        <tr key={i}>
                          <td className="py-1.5 px-2 font-mono text-hazard-400">{po.operator_id}</td>
                          <td className="py-1.5 px-2">{po.operator_name}</td>
                          <td className="py-1.5 px-2 font-mono">{po.phone_number || '—'}</td>
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
