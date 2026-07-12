export const DATABASE_BASELINE_CONFIRMATION = 'I_HAVE_A_VERIFIED_BACKUP';

export const HISTORICAL_MIGRATIONS = [
  '20250723121213_init',
  '20260127210816_add_sponsors',
  '20260128212016_add_structure',
  '20260129120000_remove_orphaned_models',
  '20260202120000_float_to_decimal',
  '20260202130000_add_fiscal_years',
  '20260204_soft_delete_transactions',
  '20260205182305_add_org_transactions',
  '20260206190825_add_tournament_tracking',
  '20260208142552_add_composite_indexes',
  '20260209180142_add_expense_reports',
  '20260611174500_sync_schema_with_current_app',
  '20260611201500_users_only_schema',
  '20260611213000_add_session_remember_me',
  '20260621140000_add_staff_profiles',
  '20260621150000_rename_staff_profile_discord_id',
  '20260627161500_add_auditlog_target_user_id',
  '20260630120000_account_audit_indexes',
  '20260630123000_users_list_indexes',
  '20260630133000_dashboard_locked_until_index',
  '20260708181000_system_activity_journal_indexes',
  '20260708184500_audit_log_location_keys',
  '20260708221000_remove_staff_profiles',
] as const;

export const RECONCILIATION_MIGRATION =
  '20260712120000_reconcile_migration_baseline';

export const BASELINED_MIGRATIONS = [
  ...HISTORICAL_MIGRATIONS,
  RECONCILIATION_MIGRATION,
] as const;
