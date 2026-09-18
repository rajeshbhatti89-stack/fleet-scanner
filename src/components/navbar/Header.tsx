import React from 'react';
import { Truck, ShieldCheck, QrCode, Database, Smartphone, LayoutDashboard } from 'lucide-react';
import { SupabaseConfig } from '../../lib/supabase';

interface HeaderProps {
  currentView: 'operator' | 'admin';
  onViewChange: (view: 'operator' | 'admin') => void;
  supabaseConfig: SupabaseConfig;
  onOpenSupabaseConfig: () => void;
  onNewScanClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  supabaseConfig,
  onOpenSupabaseConfig,
  onNewScanClick
}) => {
  return (
    <header className="sticky top-0 z-40 bg-industrial-900/95 backdrop-blur border-b border-industrial-800 text-white select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewChange('admin')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-hazard-500 to-amber-600 flex items-center justify-center shadow-lg shadow-hazard-500/20 text-industrial-950 font-black">
              <Truck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider text-slate-100 font-display">FLEET<span className="text-hazard-500">LOG</span></span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-industrial-800 border border-industrial-700 font-mono text-hazard-400 font-semibold tracking-widest uppercase">PRO</span>
              </div>
              <p className="text-[11px] text-industrial-400 font-mono">Odometer & Hour-Meter AI</p>
            </div>
          </div>

          {/* Center: View Switcher Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-industrial-950 border border-industrial-800">
            <button
              onClick={() => onViewChange('operator')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'operator'
                  ? 'bg-hazard-500 text-industrial-950 shadow-md font-bold'
                  : 'text-industrial-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Operator PWA</span>
            </button>
            <button
              onClick={() => onViewChange('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-hazard-500 text-industrial-950 shadow-md font-bold'
                  : 'text-industrial-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin Fleet</span>
            </button>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            {/* Quick Scan Button (if on admin or anywhere) */}
            <button
              onClick={onNewScanClick}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-hazard-400 text-xs font-semibold transition shadow-sm"
              title="Open QR Scanner"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR</span>
            </button>

            {/* Supabase Status Pill */}
            <button
              onClick={onOpenSupabaseConfig}
              className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition border ${
                supabaseConfig.mode === 'supabase' && supabaseConfig.isConnected
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                  : 'bg-industrial-800/80 border-industrial-700 text-industrial-300 hover:border-hazard-500/50'
              }`}
              title="Database & Storage Settings"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {supabaseConfig.mode === 'supabase' ? 'Supabase Live' : 'Local DB'}
              </span>
              <span className={`w-2 h-2 rounded-full ${
                supabaseConfig.mode === 'supabase' && supabaseConfig.isConnected
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-hazard-500'
              }`} />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
