# FleetLog Pro — Mobile-First Fleet Odometer & Hour-Meter Logging PWA

Industrial Progressive Web App (PWA) with QR Code verification, on-device AI/OCR reading extraction, GPS tracking, and an administrative dashboard backed by Supabase (PostgreSQL + Storage) with a 60-day auto-purge storage retention routine.

Hosted at: **[https://fleet.srijandev.in](https://fleet.srijandev.in)**

---

## 🚜 Key Features

- **Operator Mobile PWA Flow**:
  - Direct QR Scan resolution via `/scan/:qr_token` or built-in camera scanner.
  - Locked vehicle identity badges (Machine Name, Unit `KM`/`HOURS`, Last Recorded Reading).
  - Searchable Operator selection with PIN/ID verification.
  - Strict live camera capture (`capture="environment"`) with alignment viewfinder guide.
  - Client-side image compression (<500KB) and canvas preprocessing.
  - Automated client-side OCR extraction with `Tesseract.js` (digit whitelist `0123456789.`).
  - Human-in-the-loop side-by-side verification and manual digit adjustment.
  - Strict validation: Blocks submission if reading decreases; alerts on abnormal shift spikes (>500 KM or >24 hrs).
  - High-accuracy GPS location tracking (`lat`, `lng`, `accuracy`).
  - Green celebratory success screen with calculated shift run delta (`+X KM/Hours`).

- **Admin Fleet Dashboard**:
  - Fleet KPI overview: Active machines, daily shift submissions, flagged anomaly count, and total distance/hours.
  - Vehicle & Equipment Roster: Single CRUD and bulk CSV/Excel upload with downloadable templates.
  - Operator Management: Roster management with single CRUD and bulk CSV/Excel import.
  - Printable QR Stickers: High-resolution vector QR stickers formatted for A4/vinyl printing with dedicated `@media print` CSS.
  - Shift Logs Audit Table: Filter by date range, machine, operator, and anomaly flags. Zoomable photo inspector and supervisor override tool.
  - CSV/Excel Export: Export filtered shift logs for payroll, fuel reconciliation, and maintenance scheduling.

- **Supabase Cloud Backend & Storage Auto-Purge**:
  - PostgreSQL schema (`vehicles`, `operators`, `meter_logs`) with RLS policies and automatic last-known-reading trigger.
  - Supabase Storage bucket `meter-photos`.
  - 60-Day Retention Policy: Automated Supabase Edge Function & SQL routine to purge photos older than 60 days OR when storage reaches 80% watermark.
  - Permanent Data Integrity: Meter log audit rows (timestamp, vehicle, operator, confirmed reading, delta, GPS) remain permanently in the database even after photos are purged.

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```

### 3. Production Build
```bash
npm run build
```

---

## 🗄 Database Setup (Supabase)

1. Open your project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** and run the contents of `supabase_schema.sql`.
3. In the application, click the **Database** pill in the top header to input your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

---

## ☁️ Deployment

Deploy to Cloudflare Pages:
```bash
npm run build
npx wrangler pages deploy dist --project-name fleet-scanner
```
