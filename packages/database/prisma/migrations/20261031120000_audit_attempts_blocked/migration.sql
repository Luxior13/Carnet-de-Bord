-- 31 October 2026: a password or code check refused by the rate limiter now
-- leaves one « Tentatives bloquées » event per block, instead of nothing.
-- Additive value only; existing events and their classification are unchanged.
ALTER TYPE "public"."AuditAction" ADD VALUE 'ATTEMPTS_BLOCKED' AFTER 'LOGIN_FAILED';
