-- Durger King Reservations Bot — PostgreSQL schema

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id SERIAL PRIMARY KEY,
  seats INTEGER NOT NULL CHECK (seats > 0),
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  owner_telegram_id BIGINT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  booking_window_days INTEGER NOT NULL DEFAULT 60 CHECK (booking_window_days > 0),
  opening_hour INTEGER NOT NULL DEFAULT 10 CHECK (opening_hour BETWEEN 0 AND 23),
  closing_hour INTEGER NOT NULL DEFAULT 22 CHECK (closing_hour BETWEEN 1 AND 24),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE booking_status AS ENUM (
  'booked',
  'arrived',
  'cancelled',
  'rescheduled',
  'no-show'
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_telegram_id BIGINT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 4),
  assigned_table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  table_seats INTEGER,
  status booking_status NOT NULL DEFAULT 'booked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE job_status AS ENUM ('pending', 'sent', 'cancelled', 'failed');

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  guest_telegram_id BIGINT,
  run_at TIMESTAMPTZ NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings (booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_telegram_id ON bookings (guest_telegram_id);

CREATE INDEX IF NOT EXISTS idx_jobs_run_at ON jobs (run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_booking_id ON jobs (booking_id);

INSERT INTO restaurant_tables (seats, label)
SELECT seats, label
FROM (
  VALUES
    (2, 'Table 2A'),
    (2, 'Table 2B'),
    (4, 'Table 4A'),
    (4, 'Table 4B'),
    (4, 'Table 4C'),
    (4, 'Table 4D')
) AS seed(seats, label)
WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables);

INSERT INTO admin_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;