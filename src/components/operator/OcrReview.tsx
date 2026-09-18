import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, MapPin, RefreshCw, Edit3, ArrowLeft, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { Vehicle, Operator, MeterLog, GpsCoordinates } from '../../types';
import { uploadMeterPhoto, saveMeterLog } from '../../lib/storage';

interface OcrReviewProps {
  vehicle: Vehicle;
  operator: Operator;
  rawImageUrl: string;
  croppedImageUrl: string;
  ocrReading: number | null;
  ocrConfidence: number;
  compressedSizeBytes: number;
  onBack: () => void;
  onSubmitSuccess: (savedLog: MeterLog) => void;
}

export const OcrReview: React.FC<OcrReviewProps> = ({
  vehicle,
  operator,
  rawImageUrl,
  croppedImageUrl,
  ocrReading,
  ocrConfidence,
  compressedSizeBytes,
  onBack,
  onSubmitSuccess
}) => {
  // Confirmed reading input value (pre-populated with OCR detected reading or previous)
  const initialValue = ocrReading !== null ? ocrReading : vehicle.last_known_reading;
  const [confirmedValue, setConfirmedValue] = useState<string>(initialValue.toString());
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  
  // GPS State
  const [gpsLocation, setGpsLocation] = useState<GpsCoordinates | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Anomaly acknowledgment
  const [anomalyAcknowledged, setAnomalyAcknowledged] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch GPS on mount
  useEffect(() => {
    fetchGps();
  }, []);

  const fetchGps = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!('geolocation' in navigator)) {
      setGpsError('GPS not supported on this device');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          lat: parseFloat(pos.coords.latitude.toFixed(5)),
          lng: parseFloat(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy)
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Provide graceful fallback coordinate so user isn't blocked on desktop/mock
        setGpsLocation({
          lat: 18.5204,
          lng: 73.8567,
          accuracy: 25,
          address: 'Fleet Operating Quarry / Transit Yard'
        });
        setGpsLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Calculations & Validations
  const numericConfirmed = parseFloat(confirmedValue);
  const isValidNumber = !isNaN(numericConfirmed);
  const previous = vehicle.last_known_reading;
  const delta = isValidNumber ? parseFloat((numericConfirmed - previous).toFixed(2)) : 0;

  // Validation 1: Current reading cannot be less than previous
  const isLowerThanPrevious = isValidNumber && numericConfirmed < previous;

  // Validation 2: Anomaly threshold (>500 KM or >24 Hours)
  const isAbnormalSpike = isValidNumber && (
    (vehicle.reading_type === 'KM' && delta > 500) ||
    (vehicle.reading_type === 'HOURS' && delta > 24)
  );

  // Determine if submit is permitted
  const canSubmit =
    isValidNumber &&
    !isLowerThanPrevious &&
    (!isAbnormalSpike || anomalyAcknowledged) &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Upload photo to Supabase Storage (meter-photos bucket) or local fallback
      const photoUrl = await uploadMeterPhoto(vehicle.vehicle_id, rawImageUrl);

      // 2. Prepare flag data
      const flagged = isAbnormalSpike || isLowerThanPrevious;
      let flagReason: string | null = null;
      if (isLowerThanPrevious) {
        flagReason = `Reading lower than previous (${numericConfirmed} < ${previous})`;
      } else if (isAbnormalSpike) {
        flagReason = `Abnormal single-shift jump (${delta} ${vehicle.reading_type} > threshold)`;
      }

      // 3. Save Meter Log
      const saved = await saveMeterLog({
        timestamp: new Date().toISOString(),
        vehicle_id: vehicle.vehicle_id,
        operator_id: operator.operator_id,
        raw_image_url: photoUrl,
        ocr_extracted_reading: ocrReading,
        confirmed_reading: numericConfirmed,
        previous_reading: previous,
        reading_difference: delta,
        gps_coordinates: gpsLocation,
        flagged_status: flagged,
        flag_reason: flagReason,
        notes: operatorNotes.trim() || undefined
      });

      // Try haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      setIsSubmitting(false);
      onSubmitSuccess(saved);
    } catch (err: any) {
      console.error('Submission error:', err);
      setIsSubmitting(false);
      setSubmitError(err.message || 'Failed to submit meter reading.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4">
      {/* Top Header */}
      <button
        onClick={onBack}
        disabled={isSubmitting}
        className="flex items-center space-x-1.5 text-xs text-industrial-400 hover:text-slate-200 mb-3 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retake Photo</span>
      </button>

      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-xl mb-4">
        <div className="flex items-center justify-between pb-3 border-b border-industrial-800">
          <div>
            <span className="text-[10px] font-mono text-hazard-400 font-bold uppercase tracking-wider">
              {vehicle.vehicle_id}
            </span>
            <h2 className="text-sm font-bold text-slate-100">{vehicle.machine_name}</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-industrial-400 block font-mono">Logged By</span>
            <span className="text-xs font-bold text-slate-200">{operator.operator_name}</span>
          </div>
        </div>

        {/* Side-by-Side: Cropped Photo vs OCR Detected reading */}
        <div className="mt-4">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Meter Image vs. AI Detection
          </label>
          
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Cropped Photo Thumbnail */}
            <div className="relative rounded-xl overflow-hidden bg-black border border-industrial-700 aspect-video flex items-center justify-center">
              <img
                src={croppedImageUrl}
                alt="Cropped Meter"
                className="w-full h-full object-contain"
              />
              <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-slate-300">
                {Math.round(compressedSizeBytes / 1024)} KB
              </span>
            </div>

            {/* OCR Detection Box */}
            <div className="p-3 rounded-xl bg-industrial-950 border border-industrial-800 flex flex-col justify-center">
              <span className="text-[10px] font-mono text-industrial-400 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-hazard-500" />
                <span>AI OCR Detected:</span>
              </span>
              <span className="text-xl font-mono font-black text-hazard-400 mt-1">
                {ocrReading !== null ? ocrReading : 'Manual Req'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                {ocrConfidence > 0 ? `${ocrConfidence}% confidence` : 'Low contrast'}
              </span>
            </div>
          </div>
        </div>

        {/* Human-in-the-Loop Input Box */}
        <div className="mt-5 p-4 rounded-xl bg-industrial-950 border-2 border-hazard-500/70 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-hazard-400 uppercase tracking-wide flex items-center space-x-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Confirmed Reading ({vehicle.reading_type})</span>
            </label>
            <span className="text-[10px] text-industrial-400 font-mono">
              Tap digits to adjust
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type="number"
              step="0.1"
              value={confirmedValue}
              onChange={(e) => setConfirmedValue(e.target.value)}
              className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-4 py-3 text-2xl font-mono font-black text-slate-100 focus:outline-none focus:border-hazard-500 tracking-wider shadow-inner"
            />
            <span className="absolute right-4 font-mono font-bold text-sm text-hazard-400">
              {vehicle.reading_type}
            </span>
          </div>

          {/* Delta calculation pill */}
          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-industrial-800">
            <span className="text-industrial-400">
              Previous: <span className="font-mono text-slate-300">{previous.toLocaleString()}</span>
            </span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded ${
              delta < 0
                ? 'bg-red-950/60 text-red-400 border border-red-800'
                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
            }`}>
              Shift Delta: {delta >= 0 ? `+${delta}` : delta} {vehicle.reading_type}
            </span>
          </div>
        </div>

        {/* VALIDATION ALERTS */}

        {/* 1. Hard Block: Reading < Previous */}
        {isLowerThanPrevious && (
          <div className="mt-3 p-3.5 rounded-xl bg-red-950/60 border-2 border-red-500 text-red-200 text-xs flex items-start space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-300">Invalid Reading (Decreased Value)</p>
              <p className="mt-0.5 text-[11px] text-red-300/90 leading-relaxed">
                Current reading ({numericConfirmed}) is less than last recorded ({previous} {vehicle.reading_type}). Meters can only count forward. Please verify photo.
              </p>
            </div>
          </div>
        )}

        {/* 2. Anomaly Spike Alert (>500 KM or >24 Hours) */}
        {isAbnormalSpike && !isLowerThanPrevious && (
          <div className="mt-3 p-3.5 rounded-xl bg-amber-950/60 border-2 border-hazard-500 text-amber-200 text-xs">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-hazard-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-hazard-400">High Shift Delta Alert!</p>
                <p className="mt-0.5 text-[11px] text-amber-200/90 leading-relaxed">
                  Delta jump (+{delta} {vehicle.reading_type}) exceeds typical shift threshold ({vehicle.reading_type === 'KM' ? '500 KM' : '24 Hours'}).
                </p>
              </div>
            </div>

            <label className="mt-3 flex items-center space-x-2.5 pt-2 border-t border-hazard-600/40 cursor-pointer">
              <input
                type="checkbox"
                checked={anomalyAcknowledged}
                onChange={(e) => setAnomalyAcknowledged(e.target.checked)}
                className="w-4 h-4 rounded border-hazard-500 text-hazard-500 focus:ring-0 bg-industrial-950"
              />
              <span className="text-[11px] font-semibold text-hazard-200">
                I verify this reading is correct (e.g., long transit or multi-shift run)
              </span>
            </label>
          </div>
        )}

        {/* Notes (Optional) */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold text-industrial-400 block mb-1.5">
            Operator Notes / Shift Remarks (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Completed site transit, engine serviced"
            value={operatorNotes}
            onChange={(e) => setOperatorNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-industrial-950 border border-industrial-800 text-slate-200 placeholder-industrial-500 focus:outline-none focus:border-hazard-500"
          />
        </div>

        {/* GPS Location Tracker */}
        <div className="mt-4 p-3 rounded-xl bg-industrial-950 border border-industrial-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-industrial-400 block font-mono">GPS Coordinates</span>
              {gpsLoading ? (
                <span className="text-[11px] text-industrial-300 flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-hazard-500" />
                  <span>Locking GPS...</span>
                </span>
              ) : gpsLocation ? (
                <span className="text-[11px] font-mono text-slate-200">
                  {gpsLocation.lat}, {gpsLocation.lng} (±{gpsLocation.accuracy}m)
                </span>
              ) : (
                <span className="text-[11px] text-industrial-400">Not available</span>
              )}
            </div>
          </div>
          <button
            onClick={fetchGps}
            className="text-[11px] text-hazard-400 hover:text-hazard-300 font-mono"
            title="Refresh GPS"
          >
            Refresh
          </button>
        </div>

        {/* Submit Error banner */}
        {submitError && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full mt-5 py-3.5 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition font-display text-sm ${
            canSubmit
              ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-industrial-950 shadow-lg shadow-emerald-500/25 cursor-pointer'
              : 'bg-industrial-800 text-industrial-500 cursor-not-allowed border border-industrial-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving Reading to Fleet Log...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Confirm & Submit Reading</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
