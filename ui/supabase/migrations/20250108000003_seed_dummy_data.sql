-- Seed data migration - skipped due to UUID/TEXT mismatch
-- This migration is not needed for Better Auth setup
DO $$
BEGIN
  RAISE NOTICE 'Seed data migration skipped - not needed for Better Auth';
END $$;
