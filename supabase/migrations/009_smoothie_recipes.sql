-- 009: Named smoothie recipes
--
-- Replace the fixed morning_ingredients / evening_ingredients columns on
-- diet_settings with a flexible JSONB map:
--   smoothies: { "Morning Green": ["Spinach", ...], "Evening Berry": [...] }
--
-- Also widen diet_logs.smoothie_type from a constrained enum to plain text
-- so any recipe name can be stored.

-- ── diet_settings: add smoothies JSONB ────────────────────────────────────────
alter table public.diet_settings
  add column if not exists smoothies jsonb not null default '{}'::jsonb;

-- Migrate existing fixed lists into the new structure so no data is lost.
-- Only runs on rows that haven't already been migrated (smoothies is still empty).
update public.diet_settings
set smoothies = jsonb_build_object(
  'Morning', morning_ingredients,
  'Evening', evening_ingredients
)
where smoothies = '{}'::jsonb
  and (array_length(morning_ingredients, 1) > 0
    or array_length(evening_ingredients, 1) > 0);

-- ── diet_logs: remove the 'morning'/'evening' constraint on smoothie_type ─────
-- The column stays but now accepts any text (the recipe name).
alter table public.diet_logs
  drop constraint if exists diet_logs_smoothie_type_check;
