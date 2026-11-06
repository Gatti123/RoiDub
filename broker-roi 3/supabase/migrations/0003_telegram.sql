-- Telegram Mini App: link each broker to their Telegram account
alter table public.profiles add column if not exists telegram_id bigint unique;
