import React from 'react';
import { Truck, Lock, LogOut, Database, QrCode, Shield } from 'lucide-react';
import { SupabaseConfig } from '../../lib/supabase';

interface HeaderProps {
  currentView: 'operator' | 'admin';
  isAdminAuthenticated: boolean;
  onOpenAdminAuth: () => void;
  onExitAdmin: () => void;
  supabaseConfig: SupabaseConfig;
  onOpenSupabaseConfig: () => void;
  onNewScanClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  isAdminAuthenticated,
  onOpenAdminAuth,
  onExitAdmin,
  supabaseConfig,
  onOpenSupabaseConfig,
  onNewScanClick
}) => {
  return (
    <header className="sticky top-0 z-40 bg-industrial-900/95 backdrop-blur border-b border-industrial-800 text-white select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-hazard-500 to-amber-600 flex items-center justify-center shadow-lg shadow-hazard-500/20 text-industrial-950 font-black">
              <Truck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider text-slate-100 font-display">FLEET<span className="text-hazard-500">LOG</span></span>
                {currentView === 'admin' ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/80 border border-red-700/80 font-mono text-red-400 font-bold uppercase tracking-wider">
                    ADMIN
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-industrial-800 border border-industrial-700 font-mono text-hazard-400 font-semibold tracking-widest uppercase">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-industrial-400 font-mono">
                {currentView === 'admin' ? 'Fleet Management & Logs' : 'Vehicle Shift Scanner'}
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2.5">
            {currentView === 'admin' ? (
              <>
                {/* Supabase Status Pill (Admin Only) */}
                <button
                  onClick={onOpenSupabaseConfig}
                  className={`hidden sm:flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition border ${
                    supabaseConfig.mode === 'supabase' && supabaseConfig.isConnected
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                      : 'bg-industrial-800/80 border-industrial-700 text-industrial-300 hover:border-hazard-500/50'
                  }`}
                  title="Database & Storage Settings"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{supabaseConfig.mode === 'supabase' ? 'Supabase' : 'Local DB'}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    supabaseConfig.mode === 'supabase' && supabaseConfig.isConnected
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-hazard-500'
                  }`} />
                </button>

                {/* Return to Scanner Button */}
                <button
                  onClick={onNewScanClick}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-slate-200 text-xs font-semibold transition"
                >
                  <QrCode className="w-4 h-4 text-hazard-500" />
                  <span>Scanner</span>
                </button>

                {/* Exit / Lock Admin Mode */}
                <button
                  onClick={onExitAdmin}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-bold transition shadow-sm"
                  title="Lock and return to Operator mode"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock Admin</span>
                </button>
              </>
            ) : (
              <>
                {/* Discrete Admin Security Access Button (Requires PIN) */}
                <button
                  onClick={onOpenAdminAuth}
                  className="p-2 rounded-xl text-industrial-500 hover:text-slate-300 hover:bg-industrial-800/80 transition"
                  title="Administrator Portal"
                  aria-label="Admin Access"
                >
                  <Lock className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
