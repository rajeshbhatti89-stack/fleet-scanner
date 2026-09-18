import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, ArrowRight, Truck, Clock, MapPin, QrCode, User } from 'lucide-react';
import { MeterLog, Vehicle } from '../../types';

interface SuccessModalProps {
  log: MeterLog;
  vehicle: Vehicle;
  onScanNext: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  log,
  vehicle,
  onScanNext
}) => {
  useEffect(() => {
    // Fire festive green and gold confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#3b82f6', '#ffffff']
      });
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-industrial-900 border-2 border-emerald-500/80 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Check Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <h1 className="text-2xl font-black text-slate-100 font-display">
          Reading Recorded!
        </h1>
        <p className="text-xs text-industrial-400 mt-1">
          Synchronized to fleet log database
        </p>

        {/* Delta Display Badge */}
        <div className="my-6 p-4 rounded-2xl bg-industrial-950 border border-emerald-500/40 shadow-inner">
          <span className="text-[11px] font-mono text-industrial-400 uppercase tracking-wider block">
            Shift Run Delta
          </span>
          <span className="text-3xl font-mono font-black text-emerald-400 mt-1 block">
            +{log.reading_difference.toLocaleString()} {vehicle.reading_type}
          </span>
          <div className="mt-2 pt-2 border-t border-industrial-800 flex justify-center space-x-4 text-xs font-mono text-slate-300">
            <span>New: <b className="text-slate-100">{log.confirmed_reading.toLocaleString()}</b></span>
            <span className="text-industrial-600">|</span>
            <span>Prev: <b className="text-slate-400">{log.previous_reading.toLocaleString()}</b></span>
          </div>
        </div>

        {/* Vehicle & Timestamp metadata */}
        <div className="space-y-2 text-left bg-industrial-850 p-4 rounded-xl border border-industrial-800 text-xs mb-6">
          <div className="flex items-center justify-between">
            <span className="text-industrial-400 flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5 text-hazard-500" />
              <span>Machine:</span>
            </span>
            <span className="font-bold text-slate-200">{vehicle.machine_name} ({vehicle.vehicle_id})</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-industrial-400 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Operator:</span>
            </span>
            <span className="font-bold text-slate-100">
              {log.operator?.operator_name || log.operator_id}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-industrial-400 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Timestamp:</span>
            </span>
            <span className="font-mono text-slate-300">
              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {log.gps_coordinates && (
            <div className="flex items-center justify-between">
              <span className="text-industrial-400 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Location:</span>
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {log.gps_coordinates.lat}, {log.gps_coordinates.lng}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="space-y-2.5">
          <button
            onClick={onScanNext}
            className="w-full py-3.5 px-4 rounded-xl bg-hazard-500 hover:bg-hazard-400 active:scale-[0.98] text-industrial-950 font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-hazard-500/25 font-display text-sm"
          >
            <QrCode className="w-4 h-4 stroke-[2.5]" />
            <span>Scan Next Vehicle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
