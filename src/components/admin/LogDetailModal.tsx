import React, { useState } from 'react';
import { X, ZoomIn, MapPin, AlertTriangle, ShieldCheck, Edit3, Check, RefreshCw, Calendar, Clock, HardDrive } from 'lucide-react';
import { MeterLog } from '../../types';
import { updateMeterLog } from '../../lib/storage';

interface LogDetailModalProps {
  log: MeterLog;
  onClose: () => void;
  onLogUpdated: (updated: MeterLog) => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({
  log,
  onClose,
  onLogUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editReading, setEditReading] = useState(log.confirmed_reading.toString());
  const [editNotes, setEditNotes] = useState(log.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const isPurged = log.raw_image_url === 'purged_due_to_retention';

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newNum = parseFloat(editReading);
    if (isNaN(newNum)) return;

    setIsSaving(true);
    const newDelta = parseFloat((newNum - log.previous_reading).toFixed(2));
    const isAnom = newDelta < 0 || (log.vehicle?.reading_type === 'KM' ? newDelta > 500 : newDelta > 24);

    const updated = await updateMeterLog(log.log_id, {
      confirmed_reading: newNum,
      reading_difference: newDelta,
      flagged_status: isAnom,
      flag_reason: isAnom ? `Admin adjusted reading: delta ${newDelta}` : null,
      notes: editNotes.trim() || undefined
    });

    setIsSaving(false);
    if (updated) {
      onLogUpdated({
        ...log,
        ...updated
      });
      setIsEditing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-industrial-900 border border-industrial-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-industrial-800 flex items-center justify-between bg-industrial-950">
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-hazard-500 text-industrial-950 uppercase">
              LOG AUDIT
            </span>
            <span className="font-mono text-xs text-industrial-400">
              ID: {log.log_id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-industrial-800 hover:bg-industrial-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          
          {/* PHOTO INSPECTION AREA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <span>Odometer / Meter Image Capture</span>
              </label>

              {!isPurged && log.raw_image_url && (
                <button
                  onClick={() => setZoomLevel(prev => (prev === 1 ? 1.8 : 1))}
                  className="text-hazard-400 hover:text-hazard-300 font-mono text-[11px] flex items-center space-x-1"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{zoomLevel === 1 ? 'Zoom 180%' : 'Reset Zoom'}</span>
                </button>
              )}
            </div>

            <div className="rounded-2xl overflow-hidden bg-black border border-industrial-800 relative aspect-video flex items-center justify-center">
              {isPurged ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-950/60 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto mb-2">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-200">Image File Purged (Retention Policy)</p>
                  <p className="text-[11px] text-industrial-400 max-w-sm mt-1">
                    Image was automatically removed to conserve Supabase storage. Complete audit log and verified readings are permanently retained.
                  </p>
                </div>
              ) : log.raw_image_url ? (
                <img
                  src={log.raw_image_url}
                  alt="Meter Capture"
                  style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out' }}
                  className="max-h-full max-w-full object-contain cursor-pointer"
                  onClick={() => setZoomLevel(prev => (prev === 1 ? 1.8 : 1))}
                />
              ) : (
                <div className="text-industrial-500">No photo uploaded</div>
              )}
            </div>
          </div>

          {/* SIDE-BY-SIDE AUDIT STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-industrial-950 p-3 rounded-xl border border-industrial-800">
              <span className="text-[10px] font-mono text-industrial-400 uppercase">AI OCR Reading</span>
              <div className="text-base font-mono font-bold text-slate-200 mt-1">
                {log.ocr_extracted_reading !== null ? log.ocr_extracted_reading : 'N/A'}
              </div>
            </div>

            <div className="bg-industrial-950 p-3 rounded-xl border border-industrial-800">
              <span className="text-[10px] font-mono text-industrial-400 uppercase">Confirmed Value</span>
              <div className="text-base font-mono font-bold text-hazard-400 mt-1">
                {log.confirmed_reading.toLocaleString()} {log.vehicle?.reading_type}
              </div>
            </div>

            <div className="bg-industrial-950 p-3 rounded-xl border border-industrial-800">
              <span className="text-[10px] font-mono text-industrial-400 uppercase">Previous Reading</span>
              <div className="text-base font-mono font-bold text-industrial-400 mt-1">
                {log.previous_reading.toLocaleString()}
              </div>
            </div>

            <div className="bg-industrial-950 p-3 rounded-xl border border-industrial-800">
              <span className="text-[10px] font-mono text-industrial-400 uppercase">Shift Delta</span>
              <div className={`text-base font-mono font-bold mt-1 ${
                log.reading_difference < 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                +{log.reading_difference.toLocaleString()} {log.vehicle?.reading_type}
              </div>
            </div>
          </div>

          {/* ANOMALY STATUS */}
          {log.flagged_status && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-red-300 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-200">Flagged Anomaly:</span>
                <p className="mt-0.5 text-[11px] text-red-300/90">{log.flag_reason || 'High delta spike or decreased reading'}</p>
              </div>
            </div>
          )}

          {/* METADATA ROWS */}
          <div className="bg-industrial-850 p-4 rounded-xl border border-industrial-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-industrial-400">Vehicle / Machine:</span>
              <span className="font-bold text-slate-200">
                {log.vehicle?.machine_name || log.vehicle_id} ({log.vehicle_id})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-industrial-400">Operator:</span>
              <span className="font-bold text-slate-200">
                {log.operator?.operator_name || log.operator_id} ({log.operator_id})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-industrial-400">Recorded At:</span>
              <span className="font-mono text-slate-200">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>

            {log.gps_coordinates && (
              <div className="flex items-center justify-between">
                <span className="text-industrial-400 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>GPS Location:</span>
                </span>
                <a
                  href={`https://www.google.com/maps?q=${log.gps_coordinates.lat},${log.gps_coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-hazard-400 hover:underline"
                >
                  {log.gps_coordinates.lat}, {log.gps_coordinates.lng} (±{log.gps_coordinates.accuracy}m)
                </a>
              </div>
            )}

            {log.notes && (
              <div className="pt-2 border-t border-industrial-800">
                <span className="text-industrial-400 block mb-0.5">Notes:</span>
                <p className="text-slate-300 text-[11px] italic">{log.notes}</p>
              </div>
            )}
          </div>

          {/* ADMIN OVERRIDE / MANUAL CORRECTION */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="p-4 rounded-2xl bg-industrial-950 border border-hazard-500/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-hazard-400 flex items-center space-x-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Admin Reading Override</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-industrial-400 hover:text-slate-200 text-[11px]"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-industrial-400 block mb-1">Corrected Value ({log.vehicle?.reading_type}):</label>
                <input
                  type="number"
                  step="0.1"
                  value={editReading}
                  onChange={(e) => setEditReading(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-hazard-500"
                />
              </div>

              <div>
                <label className="text-industrial-400 block mb-1">Supervisor Adjustment Reason:</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Corrected transposition typo from photo visual inspection"
                  className="w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-700 text-slate-100 text-xs focus:outline-none focus:border-hazard-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-hazard-500 hover:bg-hazard-400 text-industrial-950 font-bold flex items-center space-x-1.5 transition shadow"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span>Save Override</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-hazard-400 font-semibold text-xs flex items-center space-x-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Admin Edit / Override Reading</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
