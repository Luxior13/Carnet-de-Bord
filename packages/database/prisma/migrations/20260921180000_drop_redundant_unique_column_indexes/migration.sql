BEGIN;

-- `Session_token_idx` and `RateLimit_key_idx` duplicated the plain B-tree index
-- that PostgreSQL already builds for the `@unique` constraints on the same
-- columns (`Session_token_key` and `RateLimit_key_key`). Both were introduced
-- before the columns were declared unique and only cost write time and space.
--
-- The trigram index on `User.loginName` is deliberately kept: it serves
-- partial-match searches, which a B-tree cannot answer.

DROP INDEX IF EXISTS "public"."Session_token_idx";
DROP INDEX IF EXISTS "public"."RateLimit_key_idx";

COMMIT;
