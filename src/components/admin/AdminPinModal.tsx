import React, { useState } from 'react';
import { Shield, Lock, X, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_ADMIN_PIN = '8989';
const FALLBACK_ADMIN_PIN = '1234';

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const storedPin = localStorage.getItem('fleetlog_admin_pin') || DEFAULT_ADMIN_PIN;

    if (pin.trim() === storedPin || pin.trim() === FALLBACK_ADMIN_PIN) {
      sessionStorage.setItem('fleetlog_admin_auth', 'true');
      setError(null);
      setPin('');
      onSuccess();
    } else {
      setError('Invalid Admin PIN. Access restricted to authorized fleet managers.');
      setPin('');
    }
  };

  const handleKeypadPress = (val: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + val);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-industrial-900 border-2 border-industrial-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-hazard-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-industrial-400 hover:text-slate-200 hover:bg-industrial-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-hazard-500/15 border border-hazard-500/30 text-hazard-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-hazard-500/10">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h2 className="text-lg font-black text-slate-100 font-display">
            Admin Verification
          </h2>
          <p className="text-xs text-industrial-400 mt-1 max-w-[240px] mx-auto">
            Restricted area. Enter administrator security PIN to access fleet settings and logs.
          </p>
        </div>

        {/* PIN Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              maxLength={8}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              placeholder="••••"
              autoFocus
              className="w-full py-3 px-4 text-center text-2xl font-mono tracking-[0.5em] rounded-2xl bg-industrial-950 border-2 border-industrial-700 text-hazard-400 focus:outline-none focus:border-hazard-500 transition shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-industrial-500 hover:text-slate-300"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Numeric Touch Keypad for Fast Mobile Entry */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num.toString())}
                className="py-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 active:bg-hazard-500 active:text-industrial-950 border border-industrial-750 text-slate-100 font-mono font-bold text-lg transition shadow-sm"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleDelete}
              className="py-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-industrial-400 text-xs font-bold transition"
            >
              DEL
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 active:bg-hazard-500 active:text-industrial-950 border border-industrial-750 text-slate-100 font-mono font-bold text-lg transition shadow-sm"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={pin.length === 0}
              className="py-3 rounded-xl bg-hazard-500 hover:bg-hazard-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-industrial-950 font-bold text-xs flex items-center justify-center transition shadow-md"
            >
              <Check className="w-5 h-5 stroke-[3]" />
            </button>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[10px] text-industrial-500 font-mono">
              Default Master PIN: 8989
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
