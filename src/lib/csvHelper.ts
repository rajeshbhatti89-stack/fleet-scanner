import { Vehicle, Operator, MeterLog } from '../types';

/**
 * Downloads text/csv content as a file to user's browser
 */
export const downloadCsvFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ==========================================
// TEMPLATES
// ==========================================

export const downloadVehicleTemplate = () => {
  const headers = ['Vehicle ID', 'Machine Name', 'Reading Type (KM or HOURS)', 'Initial Reading', 'Status'];
  const sampleRows = [
    ['JCB-3DX-02', 'JCB 3DX Super Backhoe', 'HOURS', '1250.0', 'Active'],
    ['TIP-2830-105', 'Tata Prima 2830 Tipper', 'KM', '35000.0', 'Active'],
    ['CAT-320D-10', 'Caterpillar 320D Excavator', 'HOURS', '4200.5', 'Active']
  ];
  const csv = [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  downloadCsvFile('vehicles_template.csv', csv);
};

export const downloadOperatorTemplate = () => {
  const headers = ['Operator ID', 'Operator Name', 'Phone Number', 'Status'];
  const sampleRows = [
    ['OP-2001', 'Arjun Verma', '+91 98765 11223', 'Active'],
    ['OP-2002', 'Mahesh Patel', '+91 98765 33445', 'Active']
  ];
  const csv = [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  downloadCsvFile('operators_template.csv', csv);
};

// ==========================================
// PARSING
// ==========================================

export const parseVehiclesCsv = (csvText: string): { vehicles: Vehicle[]; errors: string[] } => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { vehicles: [], errors: ['CSV file is empty or missing data rows.'] };
  }

  const vehicles: Vehicle[] = [];
  const errors: string[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple CSV parse with quotes support
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
    const cols: string[] = [];
    let match;
    while ((match = regex.exec(rawLine)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      const val = match[1] ? match[1].replace(/""/g, '"') : match[2];
      cols.push(val ? val.trim() : '');
    }

    if (cols.length < 3) {
      errors.push(`Row ${i + 1}: Insufficient columns.`);
      continue;
    }

    const vehicle_id = cols[0];
    const machine_name = cols[1];
    const readingTypeRaw = (cols[2] || '').toUpperCase();
    const reading_type = readingTypeRaw.includes('HOUR') ? 'HOURS' : 'KM';
    const last_known_reading = cols[3] ? parseFloat(cols[3]) || 0 : 0;
    const status = cols[4]?.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

    if (!vehicle_id || !machine_name) {
      errors.push(`Row ${i + 1}: Missing Vehicle ID or Machine Name.`);
      continue;
    }

    vehicles.push({
      vehicle_id,
      machine_name,
      reading_type,
      qr_code_token: `qr-${vehicle_id.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 6)}`,
      last_known_reading,
      status
    });
  }

  return { vehicles, errors };
};

export const parseOperatorsCsv = (csvText: string): { operators: Operator[]; errors: string[] } => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { operators: [], errors: ['CSV file is empty or missing data rows.'] };
  }

  const operators: Operator[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
    const cols: string[] = [];
    let match;
    while ((match = regex.exec(rawLine)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      const val = match[1] ? match[1].replace(/""/g, '"') : match[2];
      cols.push(val ? val.trim() : '');
    }

    if (cols.length < 2) {
      errors.push(`Row ${i + 1}: Insufficient columns.`);
      continue;
    }

    const operator_id = cols[0];
    const operator_name = cols[1];
    const phone_number = cols[2] || '';
    const status = cols[3]?.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

    if (!operator_id || !operator_name) {
      errors.push(`Row ${i + 1}: Missing Operator ID or Name.`);
      continue;
    }

    operators.push({
      operator_id,
      operator_name,
      phone_number,
      status
    });
  }

  return { operators, errors };
};

// ==========================================
// LOGS EXPORT
// ==========================================

export const exportMeterLogsToCsv = (logs: MeterLog[]) => {
  const headers = [
    'Log ID',
    'Date & Time (UTC)',
    'Vehicle ID',
    'Machine Name',
    'Unit',
    'Operator ID',
    'Operator Name',
    'Previous Reading',
    'Confirmed Reading',
    'Run Delta',
    'OCR Detected',
    'Flagged Anomaly',
    'Flag Reason',
    'GPS Latitude',
    'GPS Longitude',
    'GPS Address',
    'Photo Status / URL',
    'Notes'
  ];

  const rows = logs.map(l => [
    l.log_id,
    new Date(l.timestamp).toISOString(),
    l.vehicle_id,
    l.vehicle?.machine_name || '',
    l.vehicle?.reading_type || '',
    l.operator_id,
    l.operator?.operator_name || '',
    l.previous_reading,
    l.confirmed_reading,
    l.reading_difference,
    l.ocr_extracted_reading ?? 'N/A',
    l.flagged_status ? 'YES' : 'NO',
    l.flag_reason || '',
    l.gps_coordinates?.lat || '',
    l.gps_coordinates?.lng || '',
    l.gps_coordinates?.address || '',
    l.raw_image_url === 'purged_due_to_retention' ? 'PURGED (RETENTION)' : (l.raw_image_url ? 'AVAILABLE' : 'NONE'),
    l.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  downloadCsvFile(`fleet_meter_logs_${timestamp}.csv`, csvContent);
};
