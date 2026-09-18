import React, { useState, useEffect } from 'react';
import { Header } from './components/navbar/Header';
import { ScanLanding } from './components/operator/ScanLanding';
import { CameraCapture } from './components/operator/CameraCapture';
import { OcrReview } from './components/operator/OcrReview';
import { SuccessModal } from './components/operator/SuccessModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SupabaseConfigModal } from './components/admin/SupabaseConfigModal';
import { getStoredSupabaseConfig, SupabaseConfig } from './lib/supabase';
import { Vehicle, Operator, MeterLog } from './types';
import { getVehicleByToken, saveVehicle } from './lib/storage';

type OperatorStep = 'scan' | 'capture' | 'review' | 'success';

export function App() {
  const [currentView, setCurrentView] = useState<'operator' | 'admin'>('operator');
  const [operatorStep, setOperatorStep] = useState<OperatorStep>('scan');
  
  // Operator active state
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [activeOperator, setActiveOperator] = useState<Operator | null>(null);
  const [captureData, setCaptureData] = useState<{
    rawImageUrl: string;
    croppedImageUrl: string;
    ocrReading: number | null;
    ocrConfidence: number;
    compressedSizeBytes: number;
  } | null>(null);
  const [savedLog, setSavedLog] = useState<MeterLog | null>(null);

  // Supabase Config state
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getStoredSupabaseConfig());
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Parse hash URL for direct QR scan tokens: e.g. /#scan=token or native phone camera scans
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;
      const match = hash.match(/scan=([^&]+)/);
      if (match && match[1]) {
        const token = decodeURIComponent(match[1]);
        let v = await getVehicleByToken(token);

        // If not found in local store, but hash contains embedded vehicle parameters from QR sticker
        if (!v) {
          const vidMatch = hash.match(/vid=([^&]+)/);
          if (vidMatch) {
            const vid = decodeURIComponent(vidMatch[1]);
            const nameMatch = hash.match(/name=([^&]+)/);
            const typeMatch = hash.match(/type=([^&]+)/);
            const lastMatch = hash.match(/last=([^&]+)/);
            const embeddedVehicle: Vehicle = {
              vehicle_id: vid,
              machine_name: nameMatch ? decodeURIComponent(nameMatch[1]) : vid,
              reading_type: (typeMatch && decodeURIComponent(typeMatch[1]).toUpperCase() === 'KM') ? 'KM' : 'HOURS',
              qr_code_token: token,
              last_known_reading: lastMatch ? parseFloat(decodeURIComponent(lastMatch[1])) || 0 : 0,
              status: 'Active'
            };
            await saveVehicle(embeddedVehicle);
            v = embeddedVehicle;
          }
        }

        if (v) {
          setActiveVehicle(v);
          setOperatorStep('capture');
          setCurrentView('operator');
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleVehicleSelected = (vehicle: Vehicle) => {
    setActiveVehicle(vehicle);
    setOperatorStep('capture');
  };

  const handleCaptureComplete = (data: {
    rawImageUrl: string;
    croppedImageUrl: string;
    ocrReading: number | null;
    ocrConfidence: number;
    selectedOperator: Operator;
    compressedSizeBytes: number;
  }) => {
    setActiveOperator(data.selectedOperator);
    setCaptureData({
      rawImageUrl: data.rawImageUrl,
      croppedImageUrl: data.croppedImageUrl,
      ocrReading: data.ocrReading,
      ocrConfidence: data.ocrConfidence,
      compressedSizeBytes: data.compressedSizeBytes
    });
    setOperatorStep('review');
  };

  const handleSubmitSuccess = (log: MeterLog) => {
    setSavedLog(log);
    setOperatorStep('success');
  };

  const handleScanNext = () => {
    setActiveVehicle(null);
    setActiveOperator(null);
    setCaptureData(null);
    setSavedLog(null);
    setOperatorStep('scan');
    // Clear hash if any
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-950 text-slate-100 flex flex-col font-sans">
      {/* Universal Header */}
      <Header
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        supabaseConfig={supabaseConfig}
        onOpenSupabaseConfig={() => setIsConfigOpen(true)}
        onNewScanClick={() => {
          handleScanNext();
          setCurrentView('operator');
        }}
      />

      {/* Main Screen Body */}
      <main className="flex-1">
        {currentView === 'operator' ? (
          <div className="py-2">
            {operatorStep === 'scan' && (
              <ScanLanding
                onVehicleSelected={handleVehicleSelected}
                onGoToAdmin={() => setCurrentView('admin')}
              />
            )}

            {operatorStep === 'capture' && activeVehicle && (
              <CameraCapture
                vehicle={activeVehicle}
                onBack={handleScanNext}
                onCaptureComplete={handleCaptureComplete}
              />
            )}

            {operatorStep === 'review' && activeVehicle && activeOperator && captureData && (
              <OcrReview
                vehicle={activeVehicle}
                operator={activeOperator}
                rawImageUrl={captureData.rawImageUrl}
                croppedImageUrl={captureData.croppedImageUrl}
                ocrReading={captureData.ocrReading}
                ocrConfidence={captureData.ocrConfidence}
                compressedSizeBytes={captureData.compressedSizeBytes}
                onBack={() => setOperatorStep('capture')}
                onSubmitSuccess={handleSubmitSuccess}
              />
            )}

            {operatorStep === 'success' && savedLog && activeVehicle && (
              <SuccessModal
                log={savedLog}
                vehicle={activeVehicle}
                onScanNext={handleScanNext}
                onViewDashboard={() => setCurrentView('admin')}
              />
            )}
          </div>
        ) : (
          <AdminDashboard
            onOpenScan={() => {
              handleScanNext();
              setCurrentView('operator');
            }}
          />
        )}
      </main>

      {/* Database / Supabase Credentials Settings Modal */}
      {isConfigOpen && (
        <SupabaseConfigModal
          onClose={() => setIsConfigOpen(false)}
          onConfigSaved={(updated) => setSupabaseConfig(updated)}
        />
      )}
    </div>
  );
}
export default App;
