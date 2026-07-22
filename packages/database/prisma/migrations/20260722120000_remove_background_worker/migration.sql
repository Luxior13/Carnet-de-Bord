-- The application no longer has a persistent background worker. Person
-- deletion is synchronous and recurring maintenance is run as a one-shot
-- operator command, so the durable queue has no remaining producer.
DROP TABLE IF EXISTS "public"."BackgroundJob";
DROP TYPE IF EXISTS "public"."BackgroundJobStatus";
