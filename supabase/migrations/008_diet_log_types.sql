-- 008: Expand diet log types — standalone Supplements and Medications entries
--
-- 1. Add medications list to diet_settings
-- 2. Add medications_checked / medications_omitted columns to diet_logs
-- 3. Expand log_type check constraint to include 'supplements' and 'medications'
-- 4. Remove supplements from smoothie — supplements now have their own log type

-- ── diet_settings: add medications list ────────────────────────────────────────
alter table public.diet_settings
  add column if not exists medications text[] not null default '{}';

-- ── diet_logs: add medication tracking columns ─────────────────────────────────
alter table public.diet_logs
  add column if not exists medications_checked text[] not null default '{}',
  add column if not exists medications_omitted  text[] not null default '{}';

-- ── Expand log_type check constraint ──────────────────────────────────────────
-- Drop the old constraint by name, then re-add with the new set of values.
alter table public.diet_logs
  drop constraint if exists diet_logs_log_type_check;

alter table public.diet_logs
  add constraint diet_logs_log_type_check
  check (log_type in ('meal', 'smoothie', 'supplements', 'medications'));
