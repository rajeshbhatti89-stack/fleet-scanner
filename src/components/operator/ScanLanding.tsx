import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, Truck, AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { Vehicle } from '../../types';
import { getVehicles } from '../../lib/storage';

interface ScanLandingProps {
  onVehicleSelected: (vehicle: Vehicle) => void;
  initialToken?: string | null;
  onGoToAdmin?: () => void;
}

export const ScanLanding: React.FC<ScanLandingProps> = ({ onVehicleSelected, initialToken, onGoToAdmin }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadFleet();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (initialToken && vehicles.length > 0) {
      const found = vehicles.find(v => v.qr_code_token === initialToken || v.vehicle_id === initialToken);
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

  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);

    try {
      // Priority to environment back camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera QR scanner error:', err);
      setCameraError('Unable to open camera. Please grant camera permission or select a vehicle manually below.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSelectToken = (token: string) => {
    const vehicle = vehicles.find(v => v.qr_code_token === token || v.vehicle_id === token);
    if (vehicle) {
      stopCamera();
      onVehicleSelected(vehicle);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Industrial Header Card */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-hazard-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-hazard-500/20 border border-hazard-500/40 flex items-center justify-center text-hazard-400">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 font-display">Vehicle Scanner</h1>
            <p className="text-xs text-industrial-400">Scan mounted vehicle QR code to log shift reading</p>
          </div>
        </div>

        {/* Live Camera Scanner Box */}
        {cameraActive ? (
          <div className="relative mt-4 rounded-xl overflow-hidden bg-black border-2 border-hazard-500 aspect-square shadow-2xl">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
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
                onClick={stopCamera}
                className="px-4 py-1.5 rounded-full bg-black/80 backdrop-blur border border-industrial-700 text-xs font-semibold text-slate-200 hover:bg-industrial-800"
              >
                Cancel Camera
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <button
              onClick={startCamera}
              className="w-full py-3.5 px-4 rounded-xl bg-hazard-500 hover:bg-hazard-400 active:scale-[0.98] text-industrial-950 font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-hazard-500/20"
            >
              <Camera className="w-5 h-5" />
              <span>Launch QR Camera Scanner</span>
            </button>
          </div>
        )}

        {cameraError && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </div>

      {/* Manual / Direct Vehicle Selector */}
      <div className="bg-industrial-900/80 border border-industrial-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-hazard-500" />
            <h2 className="text-sm font-bold text-slate-200">Select Fleet Vehicle</h2>
          </div>
          <span className="text-[11px] font-mono text-industrial-400">
            {vehicles.length} Active Machines
          </span>
        </div>

        <p className="text-xs text-industrial-400 mb-4">
          Or tap a machine below to open its verified reading logger directly:
        </p>

        {loading ? (
          <div className="py-8 text-center text-industrial-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading fleet roster...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="py-8 px-4 text-center bg-industrial-950 rounded-xl border border-industrial-800 space-y-3">
            <Truck className="w-8 h-8 text-industrial-600 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-200">No Fleet Vehicles Loaded</p>
              <p className="text-[11px] text-industrial-400 mt-1 max-w-xs mx-auto">
                Add equipment machines or bulk upload a CSV file from the Admin Fleet Roster to start logging.
              </p>
            </div>
            {onGoToAdmin && (
              <button
                onClick={onGoToAdmin}
                className="px-4 py-2 rounded-xl bg-hazard-500 hover:bg-hazard-400 text-industrial-950 font-bold text-xs transition shadow-md inline-flex items-center space-x-1.5"
              >
                <span>Go to Admin Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {vehicles.map((v) => (
              <button
                key={v.vehicle_id}
                onClick={() => handleSelectToken(v.qr_code_token)}
                className="w-full p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-700/60 hover:border-hazard-500/50 flex items-center justify-between text-left transition group"
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
