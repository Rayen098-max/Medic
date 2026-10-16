-- 1. Table to store active 3D body model zone coordinates
CREATE TABLE IF NOT EXISTS body_model_config (
  zone text PRIMARY KEY,                -- e.g. "belly", "lower back", "neck"
  position jsonb NOT NULL,             -- [x, y, z]
  rotation jsonb NOT NULL,             -- [x, y, z]
  scale numeric DEFAULT 1.0,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by_name text,
  updated_at timestamptz DEFAULT NOW()
);

-- 2. Table to store immutable audit log of every body model edit
CREATE TABLE IF NOT EXISTS body_edit_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL,
  previous_coordinates jsonb,
  new_coordinates jsonb NOT NULL,
  physio_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  physio_name text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_body_model_config_updated_at ON body_model_config(updated_at);
CREATE INDEX IF NOT EXISTS idx_body_edit_audit_logs_created_at ON body_edit_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_body_edit_audit_logs_physio_name ON body_edit_audit_logs(physio_name);

-- 3. Enable RLS
ALTER TABLE body_model_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_edit_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if any exist
DROP POLICY IF EXISTS "anyone can view body model config" ON body_model_config;
DROP POLICY IF EXISTS "authenticated users can update body model config" ON body_model_config;
DROP POLICY IF EXISTS "authenticated users can insert audit logs" ON body_edit_audit_logs;
DROP POLICY IF EXISTS "admins and managers can view audit logs" ON body_edit_audit_logs;

-- Allow all users (even customers viewing their 3D link) to view body coordinates
CREATE POLICY "anyone can view body model config"
ON body_model_config FOR SELECT
USING (true);

-- Allow authenticated users (physios, admins, managers) to update/insert body coordinates
CREATE POLICY "authenticated users can update body model config"
ON body_model_config FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert audit logs
CREATE POLICY "authenticated users can insert audit logs"
ON body_edit_audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow admins and managers to view all audit logs
CREATE POLICY "admins and managers can view audit logs"
ON body_edit_audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND role IN ('admin', 'manager')
  )
);
