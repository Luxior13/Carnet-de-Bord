BEGIN;

-- The protected account is the unique application root. Refuse ambiguous
-- legacy data instead of silently choosing which identity owns the system.
DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM "public"."User"
    WHERE "isProtected" = true
  ) > 1 THEN
    RAISE EXCEPTION 'Only one protected root account may exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."User"
    WHERE "isProtected" = true
      AND (
        "role" <> 'ADMIN'
        OR "isActive" = false
        OR "deletedAt" IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'The protected root account must be active, undeleted and administrative';
  END IF;
END
$$;

ALTER TABLE "public"."User"
ADD CONSTRAINT "User_protected_root_state_check"
CHECK (
  "isProtected" = false
  OR (
    "role" = 'ADMIN'
    AND "isActive" = true
    AND "deletedAt" IS NULL
  )
);

-- Every row covered by this partial index has the same boolean value, so the
-- unique index permits at most one protected identity while leaving all
-- ordinary users unrestricted.
CREATE UNIQUE INDEX "User_single_protected_root_key"
ON "public"."User"("isProtected")
WHERE "isProtected" = true;

COMMIT;
