import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, Truck, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, Upload, Search, Sparkles, Hash, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Vehicle } from '../../types';
import { getVehicles, resolveVehicle, saveVehicle } from '../../lib/storage';

interface ScanLandingProps {
  onVehicleSelected: (vehicle: Vehicle) => void;
  initialToken?: string | null;
}

export const ScanLanding: React.FC<ScanLandingProps> = ({ onVehicleSelected, initialToken }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  // Manual search / direct entry state
  const [manualQuery, setManualQuery] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  // Fleet list search
  const [listSearch, setListSearch] = useState('');

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadFleet();
    return () => {
      isMountedRef.current = false;
      stopCameraScanner();
    };
  }, []);

  useEffect(() => {
    if (initialToken && vehicles.length > 0) {
      const found = resolveVehicle(initialToken, vehicles);
      if (found) {
        onVehicleSelected(found);
      }
    }
  }, [initialToken, vehicles]);

  const loadFleet = async () => {
    setLoading(true);
    const data = await getVehicles();
    setVehicles(data.filter(v => v.status === 'Active'));
    setLoading(false);
  };

  // Live Camera Scanner Lifecycle with Html5Qrcode
  useEffect(() => {
    if (cameraActive) {
      setCameraError(null);
      setScannedFeedback(null);

      // Delay to ensure the #qr-camera-viewport DOM element is mounted
      const timer = setTimeout(async () => {
        try {
          const container = document.getElementById('qr-camera-viewport');
          if (!container) return;

          const scanner = new Html5Qrcode('qr-camera-viewport');
          qrScannerRef.current = scanner;

          const qrSuccessCallback = (decodedText: string) => {
            if (!isMountedRef.current) return;
            handleScannedResult(decodedText);
          };

          const config = {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edgeSize = Math.max(180, Math.floor(minEdge * 0.72));
              return { width: edgeSize, height: edgeSize };
            },
            aspectRatio: 1.0
          };

          // Try back/environment camera first
          try {
            await scanner.start(
              { facingMode: 'environment' },
              config,
              qrSuccessCallback,
              () => {} // Suppress per-frame scan errors
            );
          } catch (envErr) {
            console.warn('Environment back camera failed, falling back to default camera:', envErr);
            // Fallback to front/user camera
            await scanner.start(
              { facingMode: 'user' },
              config,
              qrSuccessCallback,
              () => {}
            );
          }
        } catch (err: any) {
          console.error('Html5Qrcode scanner failed to start:', err);
          if (isMountedRef.current) {
            setCameraError(
              'Camera access was denied or is unavailable. Please grant permissions or enter the machine number manually below.'
            );
            setCameraActive(false);
          }
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        stopCameraScanner();
      };
    }
  }, [cameraActive, vehicles]);

  const stopCameraScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      qrScannerRef.current = null;
    }
    setCameraActive(false);
  };

  const handleScannedResult = async (decodedText: string) => {
    const trimmed = decodedText.trim();
    setScannedFeedback(`Recognized QR: ${trimmed}`);

    const matched = resolveVehicle(trimmed, vehicles);
    if (matched) {
      try {
        if ('vibrate' in navigator) navigator.vibrate(120);
      } catch {}

      await saveVehicle(matched);
      await stopCameraScanner();
      onVehicleSelected(matched);
    } else {
      setCameraError(
        `Scanned QR: "${trimmed}", but could not match with any registered fleet machine. Please check machine ID or select manually below.`
      );
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) {
      setManualError('Please enter a machine number or vehicle ID.');
      return;
    }

    const matched = resolveVehicle(manualQuery, vehicles);
    if (matched) {
      setManualError(null);
      stopCameraScanner();
      onVehicleSelected(matched);
    } else {
      const activeIds = vehicles.map(v => v.vehicle_id).join(', ');
      setManualError(
        `No vehicle matches "${manualQuery}". Active machines in fleet: ${activeIds || 'None found. Add one in Admin.'}`
      );
    }
  };

  const handleScanFromImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    setScannedFeedback('Analyzing image for QR code...');

    try {
      const scratchScanner = new Html5Qrcode('qr-scratch-scanner');
      const decoded = await scratchScanner.scanFile(file, true);
      handleScannedResult(decoded);
    } catch (err: any) {
      console.warn('Image QR decode error:', err);
      setCameraError(
        'No QR code could be detected in this photo. Ensure the QR code is in focus or enter the machine number manually.'
      );
      setScannedFeedback(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Quick Seed helper for instant testing
  const handleSeedSampleFleet = async () => {
    setLoading(true);
    const sampleVehicles: Vehicle[] = [
      {
        vehicle_id: 'Machine 1',
        machine_name: 'CAT 320D Hydraulic Excavator #1',
        reading_type: 'HOURS',
        qr_code_token: 'qr-machine-1-demo',
        last_known_reading: 1450.0,
        status: 'Active'
      },
      {
        vehicle_id: 'TRK-101',
        machine_name: 'Volvo FMX Tipper Truck #101',
        reading_type: 'KM',
        qr_code_token: 'qr-trk-101-demo',
        last_known_reading: 48320,
        status: 'Active'
      },
      {
        vehicle_id: 'GEN-301',
        machine_name: 'Cummins 250kVA Generator #301',
        reading_type: 'HOURS',
        qr_code_token: 'qr-gen-301-demo',
        last_known_reading: 850.5,
        status: 'Active'
      }
    ];

    for (const v of sampleVehicles) {
      await saveVehicle(v);
    }
    await loadFleet();
  };

  const filteredVehicles = vehicles.filter(v => {
    if (!listSearch.trim()) return true;
    const q = listSearch.toLowerCase();
    return (
      v.vehicle_id.toLowerCase().includes(q) ||
      v.machine_name.toLowerCase().includes(q) ||
      v.qr_code_token.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Hidden scratch container for decoding image files */}
      <div id="qr-scratch-scanner" className="hidden" />

      {/* Industrial Scanner Card */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-hazard-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-hazard-500/20 border border-hazard-500/40 flex items-center justify-center text-hazard-400 flex-shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 font-display">Vehicle Scanner</h1>
            <p className="text-xs text-industrial-400">Scan mounted machine QR code or enter machine ID</p>
          </div>
        </div>

        {/* Live Camera Scanner Box */}
        {cameraActive ? (
          <div className="relative mt-4 rounded-xl overflow-hidden bg-black border-2 border-hazard-500 aspect-square shadow-2xl">
            <div id="qr-camera-viewport" className="w-full h-full" />
            
            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 border-[36px] border-black/60 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-hazard-400 rounded-lg relative">
                {/* Laser animation */}
                <div className="laser-line" />
                {/* Corners */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-hazard-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-hazard-400" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-hazard-400" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-hazard-400" />
              </div>
            </div>

            <div className="absolute bottom-3 inset-x-3 text-center">
              <button
                onClick={stopCameraScanner}
                className="px-4 py-1.5 rounded-full bg-black/80 backdrop-blur border border-industrial-700 text-xs font-semibold text-slate-200 hover:bg-industrial-800 transition shadow-lg"
              >
                Close Camera
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {/* Primary Action Button: Launch Camera */}
            <button
              onClick={() => setCameraActive(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-hazard-500 hover:bg-hazard-400 active:scale-[0.98] text-industrial-950 font-black flex items-center justify-center space-x-2 transition shadow-lg shadow-hazard-500/20 font-display text-sm tracking-wide"
            >
              <Camera className="w-5 h-5 stroke-[2.5]" />
              <span>Launch QR Camera Scanner</span>
            </button>

            {/* Secondary Option: Upload QR Image file */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl bg-industrial-800 hover:bg-industrial-750 border border-industrial-700 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-2 transition"
            >
              <Upload className="w-4 h-4 text-industrial-400" />
              <span>Upload QR Image / Photo to Scan</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScanFromImage}
              className="hidden"
            />
          </div>
        )}

        {/* Feedback / Error notifications */}
        {scannedFeedback && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span className="truncate">{scannedFeedback}</span>
          </div>
        )}

        {cameraError && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Manual Machine Number / Vehicle ID Quick Entry */}
        <div className="mt-5 pt-4 border-t border-industrial-800">
          <form onSubmit={handleManualSearch}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5 text-hazard-500" />
                <span>Enter Machine 1 / Vehicle ID Manually</span>
              </label>
              <span className="text-[10px] text-industrial-400">Testing shortcut</span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. 1, Machine 1, TRK-101..."
                  value={manualQuery}
                  onChange={(e) => {
                    setManualQuery(e.target.value);
                    setManualError(null);
                  }}
                  className="w-full pl-8 pr-3 py-2.5 text-xs rounded-xl bg-industrial-950 border border-industrial-700 text-slate-100 placeholder-industrial-500 focus:outline-none focus:border-hazard-500 font-mono"
                />
                <Truck className="w-3.5 h-3.5 text-industrial-500 absolute left-2.5 top-3" />
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-hazard-500 hover:text-industrial-950 text-hazard-400 border border-industrial-700 hover:border-hazard-500 font-bold text-xs transition flex items-center space-x-1.5 flex-shrink-0"
              >
                <span>Open</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {manualError && (
              <div className="mt-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{manualError}</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Manual Fleet Equipment Selector & Search */}
      <div className="bg-industrial-900/80 border border-industrial-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-hazard-500" />
            <h2 className="text-sm font-bold text-slate-200">Active Fleet Equipment</h2>
          </div>
          <span className="text-[11px] font-mono text-industrial-400 bg-industrial-950 px-2 py-0.5 rounded-md border border-industrial-800">
            {vehicles.length} Machines
          </span>
        </div>

        {/* Filter Input */}
        {vehicles.length > 0 && (
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search by ID or name..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg bg-industrial-950 border border-industrial-800 text-slate-200 placeholder-industrial-500 focus:outline-none focus:border-hazard-500"
            />
            <Search className="w-3.5 h-3.5 text-industrial-500 absolute left-2.5 top-2.5" />
            {listSearch && (
              <button
                onClick={() => setListSearch('')}
                className="absolute right-2.5 top-2.5 text-industrial-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-industrial-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-hazard-500" />
            <span>Loading fleet machines...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="py-6 px-4 text-center bg-industrial-950 rounded-xl border border-industrial-800 space-y-3">
            <Truck className="w-8 h-8 text-industrial-600 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-200">No Fleet Vehicles Registered</p>
              <p className="text-[11px] text-industrial-400 mt-1 max-w-xs mx-auto">
                No active machines found. You can seed sample test machines (includes Machine 1) or add machines in Admin.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <button
                onClick={handleSeedSampleFleet}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-hazard-500 hover:bg-hazard-400 text-industrial-950 font-bold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Fleet (Machine 1)</span>
              </button>
            </div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-6 text-center text-industrial-400 text-xs bg-industrial-950 rounded-xl border border-industrial-800">
            <p>No machines match "{listSearch}"</p>
            <button
              onClick={() => setListSearch('')}
              className="mt-2 text-hazard-400 hover:underline text-[11px] font-semibold"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredVehicles.map((v) => (
              <button
                key={v.vehicle_id}
                onClick={() => {
                  stopCameraScanner();
                  onVehicleSelected(v);
                }}
                className="w-full p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-700/60 hover:border-hazard-500/60 flex items-center justify-between text-left transition group"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-hazard-400 tracking-tight">
                      {v.vehicle_id}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${
                      v.reading_type === 'KM'
                        ? 'bg-blue-950/60 text-blue-400 border border-blue-800'
                        : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                    }`}>
                      {v.reading_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                    {v.machine_name}
                  </p>
                  <p className="text-[11px] font-mono text-industrial-400 mt-0.5">
                    Last: <span className="text-slate-200 font-semibold">{v.last_known_reading.toLocaleString()}</span> {v.reading_type}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg bg-industrial-800 group-hover:bg-hazard-500 group-hover:text-industrial-950 text-industrial-400 flex items-center justify-center transition flex-shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
