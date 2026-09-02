-- Add customConditions column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "customConditions" JSONB DEFAULT '[]'::jsonb;
