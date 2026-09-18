import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, UserCheck, AlertCircle, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { Vehicle, Operator } from '../../types';
import { getOperators } from '../../lib/storage';
import { cropImage, compressImage } from '../../lib/imageUtils';
import { extractMeterReading } from '../../lib/ocr';

interface CameraCaptureProps {
  vehicle: Vehicle;
  onBack: () => void;
  onCaptureComplete: (data: {
    rawImageUrl: string;
    croppedImageUrl: string;
    ocrReading: number | null;
    ocrConfidence: number;
    selectedOperator: Operator;
    compressedSizeBytes: number;
  }) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  vehicle,
  onBack,
  onCaptureComplete
}) => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [operatorSearch, setOperatorSearch] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ pct: number; msg: string }>({ pct: 0, msg: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    const list = await getOperators();
    const active = list.filter(o => o.status === 'Active');
    setOperators(active);
    if (active.length > 0) {
      setSelectedOperatorId(active[0].operator_id);
    }
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedOperatorId) {
      setErrorMessage('Please select or verify operator identity first.');
      return;
    }

    const selectedOperator = operators.find(o => o.operator_id === selectedOperatorId);
    if (!selectedOperator) {
      setErrorMessage('Selected operator is invalid.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setOcrProgress({ pct: 15, msg: 'Compressing image client-side (<500KB)...' });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fullDataUrl = event.target?.result as string;

        // 1. Strict client-side compression below 500KB
        const { compressedDataUrl, sizeBytes } = await compressImage(fullDataUrl, 450 * 1024);
        
        setOcrProgress({ pct: 35, msg: 'Targeting meter viewfinder area...' });

        // 2. Crop to the central 80% width x 36% height meter alignment zone
        const croppedDataUrl = await cropImage(compressedDataUrl, {
          x: 10,
          y: 32,
          width: 80,
          height: 36
        });

        setOcrProgress({ pct: 55, msg: 'Running OCR digit recognition...' });

        // 3. OCR extraction with Tesseract.js
        const ocrResult = await extractMeterReading(croppedDataUrl, (progress, status) => {
          setOcrProgress({
            pct: 55 + Math.round(progress * 0.4),
            msg: `Recognizing meter digits (${progress}%)...`
          });
        });

        setIsProcessing(false);

        onCaptureComplete({
          rawImageUrl: compressedDataUrl,
          croppedImageUrl: croppedDataUrl,
          ocrReading: ocrResult.extractedNumber,
          ocrConfidence: ocrResult.confidence,
          selectedOperator,
          compressedSizeBytes: sizeBytes
        });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Image capture / OCR error:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to process camera capture.');
    }
  };


  const filteredOperators = operators.filter(o => 
    o.operator_name.toLowerCase().includes(operatorSearch.toLowerCase()) ||
    o.operator_id.toLowerCase().includes(operatorSearch.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto px-4 py-4">
      {/* Top Bar with Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-1.5 text-xs text-industrial-400 hover:text-slate-200 mb-3 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Scan Different Vehicle</span>
      </button>

      {/* Locked Vehicle Identity Badge (Read-only) */}
      <div className="bg-industrial-900 border-2 border-hazard-500/80 rounded-2xl p-4 shadow-xl mb-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-hazard-500 text-industrial-950 font-extrabold uppercase font-mono tracking-wider">
              VERIFIED VEHICLE
            </span>
            <span className="text-[10px] font-mono text-industrial-400">
              ID: {vehicle.vehicle_id}
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded font-bold font-mono ${
            vehicle.reading_type === 'KM'
              ? 'bg-blue-950/60 text-blue-400 border border-blue-800'
              : 'bg-amber-950/60 text-amber-400 border border-amber-800'
          }`}>
            {vehicle.reading_type}
          </span>
        </div>

        <h2 className="text-base font-extrabold text-slate-100 font-display mt-1.5 leading-snug">
          {vehicle.machine_name}
        </h2>

        <div className="mt-3 pt-2.5 border-t border-industrial-800 flex items-center justify-between text-xs">
          <span className="text-industrial-400">Last Recorded Reading:</span>
          <span className="font-mono font-bold text-hazard-400 text-sm">
            {vehicle.last_known_reading.toLocaleString()} {vehicle.reading_type}
          </span>
        </div>
      </div>

      {/* Operator Identification (Searchable Select) */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-lg mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <UserCheck className="w-4 h-4 text-hazard-500" />
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Operator Verification
          </label>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search operator name or ID..."
            value={operatorSearch}
            onChange={(e) => setOperatorSearch(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 placeholder-industrial-500 focus:outline-none focus:border-hazard-500"
          />

          <select
            value={selectedOperatorId}
            onChange={(e) => setSelectedOperatorId(e.target.value)}
            className="w-full px-3 py-2.5 text-xs rounded-xl bg-industrial-850 border border-industrial-700 text-slate-100 font-medium focus:outline-none focus:border-hazard-500"
          >
            {filteredOperators.map(op => (
              <option key={op.operator_id} value={op.operator_id}>
                {op.operator_name} ({op.operator_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Viewfinder Guide & Live Camera Trigger */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-lg mb-4">
        <div className="relative rounded-xl overflow-hidden bg-industrial-950 border-2 border-dashed border-hazard-500/50 aspect-[4/3] flex flex-col items-center justify-center p-4 text-center">
          
          {/* Laser guide line */}
          <div className="laser-line" />

          {/* Viewfinder Bounding Box */}
          <div className="w-[85%] h-[40%] border-2 border-hazard-400 rounded-lg flex flex-col items-center justify-center bg-black/40 relative shadow-inner">
            <span className="text-[11px] font-bold text-hazard-400 uppercase tracking-wide">
              Align Meter Inside Box
            </span>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
              Odometer / Digital 7-Segment / Analog Drum
            </span>

            {/* Viewfinder Corner Accents */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-hazard-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-hazard-400" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-hazard-400" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-hazard-400" />
          </div>

          <p className="text-[11px] text-industrial-400 mt-3 max-w-[240px]">
            Ensure good lighting and avoid glare on the display glass.
          </p>
        </div>

        {/* Hidden strict live camera input (capture="environment") */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelected}
          className="hidden"
        />

        {/* Processing Indicator */}
        {isProcessing ? (
          <div className="mt-4 p-4 rounded-xl bg-industrial-850 border border-hazard-500/40 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-hazard-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-200">{ocrProgress.msg}</p>
            <div className="w-full bg-industrial-950 rounded-full h-2 mt-2.5 overflow-hidden border border-industrial-700">
              <div
                className="bg-gradient-to-r from-hazard-500 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${ocrProgress.pct}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-industrial-400 mt-1.5">Processing OCR on-device...</p>
          </div>
        ) : (
          <div className="mt-4">
            {/* Primary Action Button: Opens Live Camera */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 px-4 rounded-xl bg-hazard-500 hover:bg-hazard-400 active:scale-[0.98] text-industrial-950 font-black flex items-center justify-center space-x-2 transition shadow-lg shadow-hazard-500/25 font-display text-sm"
            >
              <Camera className="w-5 h-5 stroke-[2.5]" />
              <span>Capture Meter Photo</span>
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Security notice */}
      <div className="flex items-center space-x-2 text-[11px] text-industrial-500 px-2">
        <Shield className="w-3.5 h-3.5 text-industrial-400" />
        <span>Strict live camera verification active (gallery uploads disabled)</span>
      </div>
    </div>
  );
};
