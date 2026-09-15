-- Add patient_name_fallback to followups for tracking unlinked followups
ALTER TABLE followups ADD COLUMN patient_name_fallback text;
