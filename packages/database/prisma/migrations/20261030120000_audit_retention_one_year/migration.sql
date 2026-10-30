BEGIN;

-- 30 October 2026: the owner set the journal retention to one year (CNIL's
-- usual range for logging is six months to a year). Only the fallback used
-- when no SystemSetting row exists changes, from 1095 to 365 days, matching
-- the application default; a stored value still wins. The body is otherwise
-- identical to 20260721120000_person_identity_foundation. CREATE OR REPLACE
-- keeps the owner and the REVOKE on PUBLIC. Nothing older than one year
-- exists at this date, so the next cleanup deletes nothing yet.
-- The expected duration prevents a stale maintenance invocation from applying
-- a shorter value after an administrator has increased retention.
CREATE OR REPLACE FUNCTION "purge_expired_audit_logs"(
    expected_retention_days INTEGER
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    configured_retention_days INTEGER;
    deleted_count BIGINT;
    previous_context TEXT;
BEGIN
    previous_context := current_setting('app.audit_delete_context', true);
    -- The matching setting mutation takes the same transaction-level lock,
    -- including while the first row is being inserted.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('system-setting:audit.retentionDays', 0)
    );
    SELECT CASE
        WHEN jsonb_typeof(setting."value") = 'number'
            THEN (setting."value" #>> '{}')::INTEGER
        ELSE NULL
    END
    INTO configured_retention_days
    FROM "public"."SystemSetting" setting
    WHERE setting."key" = 'audit.retentionDays'
    FOR SHARE;

    IF NOT FOUND THEN
        configured_retention_days := 365;
    END IF;

    IF configured_retention_days IS NULL
       OR configured_retention_days < 365
       OR configured_retention_days > 3650 THEN
        RAISE EXCEPTION 'Stored audit retention is invalid';
    END IF;
    IF expected_retention_days IS DISTINCT FROM configured_retention_days THEN
        RAISE EXCEPTION 'Audit retention changed while cleanup was being prepared';
    END IF;

    PERFORM set_config('app.audit_delete_context', 'retention', true);
    DELETE FROM "public"."AuditLog"
    WHERE "createdAt" < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      - make_interval(days => configured_retention_days);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    PERFORM set_config(
        'app.audit_delete_context',
        COALESCE(previous_context, ''),
        true
    );

    RETURN deleted_count;
EXCEPTION WHEN OTHERS THEN
    PERFORM set_config(
        'app.audit_delete_context',
        COALESCE(previous_context, ''),
        true
    );
    RAISE;
END;
$$;

COMMIT;
