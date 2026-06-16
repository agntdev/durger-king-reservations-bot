/**
 * PostgreSQL schema DDL for the Durger King reservations bot.
 *
 * Run once against a fresh database (the application is expected to apply
 * this via a migration runner or a one-shot init script in production).
 *
 * Tables: tables, bookings, users, admin_settings, jobs.
 * Indexed on date and status for efficient daily queries and status lookups.
 */

export const SCHEMA_DDL = [
  // --- tables ---
  `CREATE TABLE IF NOT EXISTS tables (
    id         INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    seats      INTEGER NOT NULL CHECK (seats > 0),
    label      TEXT    NOT NULL DEFAULT ''
  )`,

  // --- bookings ---
  `CREATE TABLE IF NOT EXISTS bookings (
    id                TEXT PRIMARY KEY,
    date              DATE   NOT NULL,
    start_hour        INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
    start_minute      INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute <= 59),
    slot              TEXT   NOT NULL,
    party_size        INTEGER NOT NULL CHECK (party_size >= 1),
    table_seats       INTEGER,
    guest_name        TEXT   NOT NULL,
    guest_phone       TEXT   NOT NULL,
    guest_telegram_id BIGINT NOT NULL,
    status            TEXT   NOT NULL DEFAULT 'booked'
                         CHECK (status IN ('booked','arrived','cancelled','rescheduled','no-show')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // --- users (guests + owner) ---
  `CREATE TABLE IF NOT EXISTS users (
    telegram_id  BIGINT PRIMARY KEY,
    name         TEXT,
    phone        TEXT,
    role         TEXT NOT NULL DEFAULT 'guest'
                  CHECK (role IN ('guest','owner')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // --- admin_settings ---
  `CREATE TABLE IF NOT EXISTS admin_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )`,

  // --- jobs ---
  `CREATE TABLE IF NOT EXISTS jobs (
    id                 TEXT PRIMARY KEY,
    run_at            TIMESTAMPTZ NOT NULL,
    booking_id         TEXT,
    guest_telegram_id BIGINT,
    sent              BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // --- indexes ---
  `CREATE INDEX IF NOT EXISTS idx_bookings_date       ON bookings (date)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings (status)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings (date, status)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_guest      ON bookings (guest_telegram_id)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_run_at         ON jobs (run_at)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_sent_run_at    ON jobs (sent, run_at)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_booking_id     ON jobs (booking_id)`,
].join("\n");

// --- typed row interfaces ---

export interface TableRow {
  id: number;
  seats: number;
  label: string;
}

export interface BookingRow {
  id: string;
  date: string;           // DATE → YYYY-MM-DD
  start_hour: number;
  start_minute: number;
  slot: string;           // "HH:MM"
  party_size: number;
  table_seats: number | null;
  guest_name: string;
  guest_phone: string;
  guest_telegram_id: number;
  status: "booked" | "arrived" | "cancelled" | "rescheduled" | "no-show";
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  telegram_id: number;
  name: string | null;
  phone: string | null;
  role: "guest" | "owner";
  created_at: string;
}

export interface AdminSettingRow {
  key: string;
  value: string;
}

export interface JobRow {
  id: string;
  run_at: string;
  booking_id: string | null;
  guest_telegram_id: number | null;
  sent: boolean;
  created_at: string;
}

// --- Canonical seed table rows for the default inventory ---

export const TABLE_SEEDS: TableRow[] = [
  { id: 0, seats: 2, label: "Table A" },
  { id: 0, seats: 2, label: "Table B" },
  { id: 0, seats: 4, label: "Table C" },
  { id: 0, seats: 4, label: "Table D" },
  { id: 0, seats: 4, label: "Table E" },
  { id: 0, seats: 4, label: "Table F" },
];

// --- Default admin_settings keys ---

export const DEFAULT_SETTINGS: Record<string, string> = {
  "owner_telegram_id": "1",
  "timezone": "UTC",
  "booking_window_days": "60",
  "max_party_size": "4",
  "opening_hour": "10",
  "closing_hour": "22",
  "slot_interval_minutes": "15",
  "booking_duration_minutes": "90",
  "reminder_lead_minutes": "120",
  "no_show_grace_minutes": "30",
  "cancellation_cutoff_minutes": "60",
};
