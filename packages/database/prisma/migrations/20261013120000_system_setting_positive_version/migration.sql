-- Version 0 is the API sentinel for an absent setting, never a stored version.
-- Preserve all existing rows; invalid data must be investigated explicitly.
-- A single DDL statement is atomic and takes the required table lock itself.
-- PostgreSQL rejects existing invalid rows with this named CHECK constraint.
ALTER TABLE "public"."SystemSetting"
ADD CONSTRAINT "SystemSetting_version_check" CHECK ("version" >= 1);
