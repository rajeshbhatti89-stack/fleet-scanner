import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, CheckSquare, Square, Download, ArrowLeft, Truck } from 'lucide-react';
import { Vehicle } from '../../types';

interface QrPrintSheetProps {
  vehicles: Vehicle[];
  preSelectedVehicleId?: string | null;
  onBack: () => void;
}

interface QrItem {
  vehicle: Vehicle;
  dataUrl: string;
  scanUrl: string;
}

export const QrPrintSheet: React.FC<QrPrintSheetProps> = ({
  vehicles,
  preSelectedVehicleId,
  onBack
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [qrItems, setQrItems] = useState<QrItem[]>([]);
  const [generating, setGenerating] = useState(true);

  // Initialize selected IDs
  useEffect(() => {
    if (preSelectedVehicleId) {
      setSelectedIds([preSelectedVehicleId]);
    } else {
      setSelectedIds(vehicles.map(v => v.vehicle_id));
    }
  }, [preSelectedVehicleId, vehicles]);

  // Generate QR codes for selected
  useEffect(() => {
    generateQrs();
  }, [selectedIds]);

  const generateQrs = async () => {
    setGenerating(true);
    const origin = window.location.origin;
    const items: QrItem[] = [];

    for (const v of vehicles) {
      if (selectedIds.includes(v.vehicle_id)) {
        const scanUrl = `${origin}/#scan=${v.qr_code_token}`;
        try {
          const dataUrl = await QRCode.toDataURL(scanUrl, {
            width: 300,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'H'
          });
          items.push({ vehicle: v, dataUrl, scanUrl });
        } catch (err) {
          console.error('Error generating QR:', err);
        }
      }
    }

    setQrItems(items);
    setGenerating(false);
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedIds(vehicles.map(v => v.vehicle_id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Action Header - Hidden on Print */}
      <div className="no-print bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-100 font-display flex items-center space-x-2">
              <Printer className="w-5 h-5 text-hazard-500" />
              <span>Printable Fleet QR Stickers (A4 / Vinyl Layout)</span>
            </h2>
            <p className="text-xs text-industrial-400">
              High-contrast printable stickers ready for lamination and mounting on vehicle dashboard/cab.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-xs text-slate-300"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-xs text-slate-300"
          >
            Clear
          </button>
          <button
            onClick={handlePrint}
            disabled={qrItems.length === 0}
            className="px-5 py-2.5 rounded-xl bg-hazard-500 hover:bg-hazard-400 active:scale-95 text-industrial-950 font-bold text-xs flex items-center space-x-2 transition shadow-lg shadow-hazard-500/20"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print {qrItems.length} Stickers</span>
          </button>
        </div>
      </div>

      {/* Selector pills - Hidden on Print */}
      <div className="no-print bg-industrial-900 border border-industrial-800 rounded-2xl p-3 shadow flex flex-wrap gap-1.5">
        {vehicles.map(v => {
          const isSelected = selectedIds.includes(v.vehicle_id);
          return (
            <button
              key={v.vehicle_id}
              onClick={() => toggleSelect(v.vehicle_id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center space-x-1.5 transition ${
                isSelected
                  ? 'bg-hazard-500 text-industrial-950 font-bold shadow-sm'
                  : 'bg-industrial-950 text-industrial-400 border border-industrial-800 hover:border-hazard-500/40'
              }`}
            >
              {isSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
              <span>{v.vehicle_id}</span>
            </button>
          );
        })}
      </div>

      {/* PRINTABLE STICKER SHEET */}
      <div className="print-only">
        {generating ? (
          <div className="py-12 text-center text-xs font-mono text-industrial-400">
            Rendering high-res QR vectors...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrItems.map(({ vehicle, dataUrl, scanUrl }) => (
              <div
                key={vehicle.vehicle_id}
                className="qr-sticker-card p-5 rounded-2xl border-2 border-black bg-white text-black shadow-md flex flex-col items-center text-center relative overflow-hidden"
              >
                {/* Top Industrial Hazard Banner */}
                <div className="w-full bg-black text-amber-400 py-1 px-3 rounded-lg font-mono font-black text-xs uppercase tracking-wider flex items-center justify-between mb-3">
                  <span>FLEET ASSET TAG</span>
                  <span className="bg-amber-400 text-black px-1.5 py-0.2 rounded font-extrabold text-[10px]">
                    {vehicle.reading_type}
                  </span>
                </div>

                {/* Machine Name */}
                <h3 className="font-extrabold text-base leading-tight font-sans mb-1 text-black">
                  {vehicle.machine_name}
                </h3>
                
                {/* Vehicle Plate/ID */}
                <div className="font-mono font-black text-xl text-black tracking-wider bg-slate-100 border border-black/20 w-full py-1 rounded-md my-1">
                  {vehicle.vehicle_id}
                </div>

                {/* QR Code Graphic */}
                <div className="p-2 bg-white rounded-xl border border-black/30 my-2 shadow-sm">
                  <img
                    src={dataUrl}
                    alt={`QR for ${vehicle.vehicle_id}`}
                    className="w-48 h-48 object-contain"
                  />
                </div>

                {/* Scan instructions & cut line */}
                <p className="text-[11px] font-bold text-slate-800 tracking-tight">
                  SCAN WITH PHONE CAMERA TO LOG METER
                </p>
                <p className="text-[9px] font-mono text-slate-500 mt-0.5 break-all max-w-[200px]">
                  Token: {vehicle.qr_code_token}
                </p>

                {/* Corner crosshairs for sticker trimming */}
                <div className="absolute top-1 left-1 text-[8px] text-slate-400 font-mono">+</div>
                <div className="absolute top-1 right-1 text-[8px] text-slate-400 font-mono">+</div>
                <div className="absolute bottom-1 left-1 text-[8px] text-slate-400 font-mono">+</div>
                <div className="absolute bottom-1 right-1 text-[8px] text-slate-400 font-mono">+</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
