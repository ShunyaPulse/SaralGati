-- Migration: Create users table
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  password_hash VARCHAR(255),
  image         TEXT,
  provider      VARCHAR(50) DEFAULT 'credentials',
  role          VARCHAR(20) DEFAULT 'caregiver' CHECK (role IN ('caregiver', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
