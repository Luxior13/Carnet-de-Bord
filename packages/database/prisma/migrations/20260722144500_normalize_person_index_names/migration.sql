-- PostgreSQL truncates identifiers after 63 bytes. The original Person
-- migration used three longer names, which made the strict readiness catalog
-- compare the declared names with silently truncated physical names.
ALTER INDEX IF EXISTS "public"."PersonSocialProfile_personId_networkKey_normalizedIdentifier_ke"
RENAME TO "PersonSocialProfile_person_network_identifier_key";

ALTER INDEX IF EXISTS "public"."PersonSocialProfile_personId_networkKey_normalizedProfileUrlHas"
RENAME TO "PersonSocialProfile_person_network_url_hash_key";

ALTER INDEX IF EXISTS "public"."AuditFieldChange_entityType_entityId_sectionKey_fieldKey_record"
RENAME TO "AuditFieldChange_history_lookup_idx";
