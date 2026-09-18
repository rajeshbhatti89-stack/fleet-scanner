import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, UserCheck, AlertCircle, ArrowLeft, Shield, Plus, Check, User, CheckCircle2, X } from 'lucide-react';
import { Vehicle, Operator } from '../../types';
import { getOperators, saveOperator } from '../../lib/storage';
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
  const [isAddingNewOperator, setIsAddingNewOperator] = useState<boolean>(false);
  const [newOperatorName, setNewOperatorName] = useState<string>('');
  const [operatorError, setOperatorError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ pct: number; msg: string }>({ pct: 0, msg: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    const list = await getOperators();
    const active = list.filter(o => o.status === 'Active');
    setOperators(active);

    // Retrieve last used operator on this device if available
    const lastOpId = localStorage.getItem('fleetlog_active_operator_id');
    if (lastOpId && active.some(o => o.operator_id === lastOpId)) {
      setSelectedOperatorId(lastOpId);
    } else if (active.length === 1) {
      setSelectedOperatorId(active[0].operator_id);
    } else if (active.length === 0) {
      // Auto-open new operator input if no operators exist in roster
      setIsAddingNewOperator(true);
    }
  };

  const handleSelectOperator = (id: string) => {
    setSelectedOperatorId(id);
    setOperatorError(null);
    if (id) {
      localStorage.setItem('fleetlog_active_operator_id', id);
    }
  };

  const handleAddNewOperator = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newOperatorName.trim();
    if (!trimmed) {
      setOperatorError('Operator name is required. Please type your name.');
      return;
    }

    const cleanSlug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const newOp: Operator = {
      operator_id: `OP-${cleanSlug || 'USER'}-${randomSuffix}`,
      operator_name: trimmed,
      status: 'Active'
    };

    await saveOperator(newOp);
    const updated = await getOperators();
    const active = updated.filter(o => o.status === 'Active');
    setOperators(active);
    setSelectedOperatorId(newOp.operator_id);
    localStorage.setItem('fleetlog_active_operator_id', newOp.operator_id);

    setIsAddingNewOperator(false);
    setNewOperatorName('');
    setOperatorError(null);
  };

  const activeOperator = operators.find(o => o.operator_id === selectedOperatorId);

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation: Operator Name is mandatory
    if (!activeOperator) {
      setOperatorError('Operator name is strictly mandatory before capturing photo.');
      setIsAddingNewOperator(true);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setOcrProgress({ pct: 15, msg: 'Compressing meter image (<500KB)...' });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fullDataUrl = event.target?.result as string;

        // 1. Client-side compression below 500KB
        const { compressedDataUrl, sizeBytes } = await compressImage(fullDataUrl, 450 * 1024);
        
        setOcrProgress({ pct: 35, msg: 'Focusing meter display viewfinder...' });

        // 2. Crop to the central meter alignment zone
        const croppedDataUrl = await cropImage(compressedDataUrl, {
          x: 10,
          y: 32,
          width: 80,
          height: 36
        });

        setOcrProgress({ pct: 55, msg: 'Extracting meter reading with OCR...' });

        // 3. OCR extraction with Tesseract.js
        const ocrResult = await extractMeterReading(croppedDataUrl, (progress) => {
          setOcrProgress({
            pct: 55 + Math.round(progress * 0.4),
            msg: `Recognizing digits (${progress}%)...`
          });
        });

        setIsProcessing(false);

        onCaptureComplete({
          rawImageUrl: compressedDataUrl,
          croppedImageUrl: croppedDataUrl,
          ocrReading: ocrResult.extractedNumber,
          ocrConfidence: ocrResult.confidence,
          selectedOperator: activeOperator,
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

      {/* Locked Vehicle Identity Badge */}
      <div className="bg-industrial-900 border-2 border-hazard-500/80 rounded-2xl p-4 shadow-xl mb-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-hazard-500 text-industrial-950 font-extrabold uppercase font-mono tracking-wider">
              VERIFIED MACHINE
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

      {/* OPERATOR NAME IDENTIFICATION - STRICTLY MANDATORY */}
      <div className={`border-2 rounded-2xl p-4 shadow-lg mb-4 transition-all ${
        activeOperator
          ? 'bg-industrial-900 border-emerald-500/60'
          : 'bg-industrial-900 border-amber-500/80 shadow-amber-500/10'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <UserCheck className={`w-4 h-4 ${activeOperator ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div className="flex items-center space-x-1.5">
              <label className="text-xs font-black tracking-wider uppercase text-slate-100">
                Operator Name
              </label>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950/80 text-red-300 border border-red-800 font-mono font-bold">
                MANDATORY *
              </span>
            </div>
          </div>

          {activeOperator && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/80 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Verified</span>
            </span>
          )}
        </div>

        {/* Input Mode: Direct Name Entry */}
        {isAddingNewOperator ? (
          <form onSubmit={handleAddNewOperator} className="space-y-2 mt-2 pt-2 border-t border-industrial-800">
            <p className="text-[11px] text-industrial-400">
              Type your operator name below. It will be permanently recorded on the audit log:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Operator Name (e.g. Rajesh Kumar)..."
                value={newOperatorName}
                onChange={(e) => {
                  setNewOperatorName(e.target.value);
                  setOperatorError(null);
                }}
                autoFocus
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-industrial-950 border border-hazard-500 text-slate-100 placeholder-industrial-500 focus:outline-none focus:ring-1 focus:ring-hazard-500 font-semibold"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-hazard-500 hover:bg-hazard-400 text-industrial-950 font-bold text-xs transition flex items-center space-x-1 flex-shrink-0"
              >
                <span>Confirm</span>
                <Check className="w-3.5 h-3.5" />
              </button>
              {operators.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewOperator(false)}
                  className="p-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-400 hover:text-slate-200 transition"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        ) : (
          /* Selection Mode + Quick Switch */
          <div className="space-y-2.5 mt-2">
            <div className="flex items-center gap-2">
              <select
                value={selectedOperatorId}
                onChange={(e) => handleSelectOperator(e.target.value)}
                className={`w-full px-3 py-2.5 text-xs rounded-xl bg-industrial-850 border font-bold focus:outline-none transition ${
                  selectedOperatorId
                    ? 'border-emerald-600/60 text-slate-100'
                    : 'border-amber-500 text-amber-300 bg-amber-950/20'
                }`}
              >
                <option value="">-- Select Operator Name --</option>
                {operators.map(op => (
                  <option key={op.operator_id} value={op.operator_id}>
                    {op.operator_name} ({op.operator_id})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsAddingNewOperator(true)}
                className="px-3 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-slate-200 hover:text-hazard-400 text-xs font-bold transition flex items-center space-x-1 flex-shrink-0"
                title="Enter a new operator name"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>

            {!activeOperator && (
              <p className="text-[11px] text-amber-400 font-medium flex items-center space-x-1 mt-1">
                <span>⚠️ Operator Name is required. Select from list or click "+ New" to enter name.</span>
              </p>
            )}
          </div>
        )}

        {operatorError && (
          <div className="mt-2.5 p-2 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{operatorError}</span>
          </div>
        )}
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

        {/* Hidden gallery file input for testing/sample photos */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
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
          <div className="mt-4 space-y-2">
            {/* Primary Action Button: Opens Live Camera */}
            <button
              onClick={() => {
                if (!activeOperator) {
                  setOperatorError('Please select or enter the Operator Name above first.');
                  setIsAddingNewOperator(true);
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`w-full py-3.5 px-4 rounded-xl font-black flex items-center justify-center space-x-2 transition shadow-lg font-display text-sm tracking-wide ${
                activeOperator
                  ? 'bg-hazard-500 hover:bg-hazard-400 active:scale-[0.98] text-industrial-950 shadow-hazard-500/25 cursor-pointer'
                  : 'bg-industrial-800 text-industrial-400 border border-industrial-700 opacity-80 cursor-not-allowed'
              }`}
            >
              <Camera className="w-5 h-5 stroke-[2.5]" />
              <span>
                {activeOperator
                  ? `Capture Meter Photo (${activeOperator.operator_name})`
                  : 'Enter Operator Name Above to Capture'}
              </span>
            </button>

            {/* Upload Photo from Device */}
            <button
              onClick={() => {
                if (!activeOperator) {
                  setOperatorError('Please select or enter the Operator Name above first.');
                  setIsAddingNewOperator(true);
                  return;
                }
                galleryInputRef.current?.click();
              }}
              className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition ${
                activeOperator
                  ? 'bg-industrial-800 hover:bg-industrial-750 border-industrial-700 text-slate-300 cursor-pointer'
                  : 'bg-industrial-900 border-industrial-800 text-industrial-500 opacity-60 cursor-not-allowed'
              }`}
            >
              <span>Upload Photo from Device</span>
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
        <span>Audit integrity: Operator verification and live photo required</span>
      </div>
    </div>
  );
};
