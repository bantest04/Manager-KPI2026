-- Schema for Manager-KPI2026 (PostgreSQL)
-- Generated from server/server.js definitions
-- Compatible with Neon (SSL required at connection level)

BEGIN;

-- =====================
-- Members
-- =====================
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  name TEXT,
  color TEXT,
  role TEXT,
  pin VARCHAR(4) DEFAULT '0000'
);

-- =====================
-- Reports (sales daily reports)
-- Note: column names are kept to match current application code
-- =====================
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  date TEXT,
  memberId INT,
  contacted INT,
  replied INT,
  closed INT,
  sales BIGINT,
  warehouse TEXT,
  orderCode TEXT,
  product TEXT,
  status TEXT,
  orderDate TEXT,
  price BIGINT,
  platform TEXT,
  customerName TEXT,
  fbLink TEXT,
  address TEXT,
  itemPrice BIGINT,
  note TEXT,
  phone TEXT
);

-- Optional foreign key (uncomment if you want FK enforcement)
-- ALTER TABLE reports
--   ADD CONSTRAINT fk_reports_member
--   FOREIGN KEY (memberId) REFERENCES members(id);

-- =====================
-- Global KPI config (legacy/reference)
-- =====================
CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  startDate TEXT,
  endDate TEXT,
  totalTarget BIGINT,
  aov BIGINT,
  replyRate REAL,
  convRate REAL
);

-- =====================
-- KPI target ranges by month (historical)
-- =====================
CREATE TABLE IF NOT EXISTS kpi_targets_by_month (
  id TEXT PRIMARY KEY,
  month TEXT,
  start_date DATE,
  end_date DATE,
  working_days INT,
  target BIGINT
);

-- =====================
-- Target allocation (%) per member per month
-- =====================
CREATE TABLE IF NOT EXISTS target_allocation (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL,
  month TEXT NOT NULL,
  percent REAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(member_id, month)
);

-- Optional foreign key (uncomment if you want FK enforcement)
-- ALTER TABLE target_allocation
--   ADD CONSTRAINT fk_allocation_member
--   FOREIGN KEY (member_id) REFERENCES members(id);

-- =====================
-- Team monthly target (single value per month)
-- =====================
CREATE TABLE IF NOT EXISTS team_target (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL UNIQUE,
  target BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Helpful indexes (optional)
-- CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date);
-- CREATE INDEX IF NOT EXISTS idx_reports_member ON reports(memberId);
-- CREATE INDEX IF NOT EXISTS idx_allocation_month ON target_allocation(month);
-- CREATE INDEX IF NOT EXISTS idx_team_target_month ON team_target(month);

COMMIT;
