import React, { useState } from 'react';
import { Database, X, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, ExternalLink, Code } from 'lucide-react';
import { getStoredSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, SupabaseConfig } from '../../lib/supabase';

interface SupabaseConfigModalProps {
  onClose: () => void;
  onConfigSaved: (config: SupabaseConfig) => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  onClose,
  onConfigSaved
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [mode, setMode] = useState<'supabase' | 'local'>(currentConfig.mode);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql'>('credentials');
  const [copiedSql, setCopiedSql] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(url, anonKey);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, anonKey, mode);
    onConfigSaved({
      url,
      anonKey,
      isConnected: !!(url && anonKey),
      mode
    });
    onClose();
  };

  const handleCopySql = () => {
    const sqlScript = `-- Run this in your Supabase SQL Editor:
-- 1. Create tables & bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('meter-photos', 'meter-photos', true) ON CONFLICT DO NOTHING;
-- See full supabase_schema.sql in the project root`;
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-industrial-900 border border-industrial-700 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-industrial-800 flex items-center justify-between bg-industrial-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-display">
                Supabase Backend & Storage Engine
              </h3>
              <p className="text-[11px] text-industrial-400">PostgreSQL tables and meter-photos storage bucket</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-industrial-800 hover:bg-industrial-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-industrial-800 bg-industrial-950 px-4 text-xs">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition ${
              activeTab === 'credentials'
                ? 'border-hazard-500 text-hazard-400'
                : 'border-transparent text-industrial-400 hover:text-slate-200'
            }`}
          >
            Connection Credentials
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'sql'
                ? 'border-hazard-500 text-hazard-400'
                : 'border-transparent text-industrial-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Database SQL Schema</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'credentials' ? (
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Backend Mode Switcher */}
              <div className="p-3.5 rounded-xl bg-industrial-950 border border-industrial-800 space-y-2">
                <span className="text-[11px] font-mono text-industrial-400 uppercase tracking-wider block">
                  Select Active Backend Mode:
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('local')}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      mode === 'local'
                        ? 'bg-hazard-500/10 border-hazard-500 text-hazard-400 font-bold'
                        : 'bg-industrial-900 border-industrial-800 text-industrial-400'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">Local-First Persistence</div>
                    <div className="text-[10px] text-industrial-400 mt-0.5">Zero config, offline-ready mock engine</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('supabase')}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      mode === 'supabase'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-industrial-900 border-industrial-800 text-industrial-400'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">Live Supabase Cloud</div>
                    <div className="text-[10px] text-industrial-400 mt-0.5">PostgreSQL DB + Storage Bucket</div>
                  </button>
                </div>
              </div>

              {/* Supabase URL */}
              <div>
                <label className="block text-industrial-400 font-semibold mb-1 font-mono">
                  SUPABASE_PROJECT_URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-hazard-500"
                />
              </div>

              {/* Supabase Anon Key */}
              <div>
                <label className="block text-industrial-400 font-semibold mb-1 font-mono">
                  SUPABASE_ANON_PUBLIC_KEY
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-hazard-500"
                />
              </div>

              {/* Health Test Result Banner */}
              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  testResult.success
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                    : 'bg-red-950/50 border-red-800 text-red-300'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-industrial-800">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || !url || !anonKey}
                  className="px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Test Connection</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-industrial-800 text-slate-300 font-semibold hover:bg-industrial-700 text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-hazard-500 hover:bg-hazard-400 text-industrial-950 font-bold text-xs transition shadow-lg shadow-hazard-500/20"
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-industrial-400">Complete SQL schema file generated: <code>supabase_schema.sql</code></span>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1 rounded-lg bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-hazard-400 text-xs font-semibold flex items-center space-x-1"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                </button>
              </div>

              <div className="p-3 bg-industrial-950 rounded-xl border border-industrial-800 font-mono text-[11px] text-industrial-300 max-h-64 overflow-y-auto space-y-1">
                <p className="text-hazard-400">-- 1. Run supabase_schema.sql in your Supabase SQL Editor</p>
                <p className="text-slate-400">-- Tables created:</p>
                <p className="text-emerald-400">✓ public.vehicles (vehicle_id, machine_name, reading_type, qr_code_token, last_known_reading, status)</p>
                <p className="text-emerald-400">✓ public.operators (operator_id, operator_name, phone_number, status)</p>
                <p className="text-emerald-400">✓ public.meter_logs (log_id, timestamp, vehicle_id, operator_id, raw_image_url, confirmed_reading, delta, gps, flagged)</p>
                <p className="text-emerald-400">✓ storage.buckets ('meter-photos')</p>
                <p className="text-emerald-400">✓ public.purge_meter_photos_retention(retention_days INT, batch INT)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
