-- ============================================================
-- 040_account_external_ref.sql — Link accounts to an external system
--
-- Adds `accounts.external_ref`, the id an external platform (e.g. an
-- ERP that embeds this CRM as its WhatsApp engine) uses for the
-- account. The admin provisioning API (`/api/admin/v1/accounts`)
-- finds-or-creates accounts by this value, so provisioning the same
-- external tenant twice reuses its account instead of duplicating it.
--
-- NULL for every account created through the normal signup flow.
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS external_ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_external_ref_key
  ON accounts (external_ref)
  WHERE external_ref IS NOT NULL;
