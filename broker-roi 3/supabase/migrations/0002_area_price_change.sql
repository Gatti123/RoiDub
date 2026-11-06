-- Observed price change used as a reference next to the growth assumption
alter table public.areas add column if not exists price_change_pct numeric;
