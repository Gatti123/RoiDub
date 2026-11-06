-- Yield Desk: schema

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  agency text default '',
  brn text default '',
  phone text default '',
  whatsapp text default '',
  email text default '',
  logo_url text,
  created_at timestamptz default now()
);

create table if not exists public.areas (
  id text primary key,
  name_en text not null,
  name_ru text not null,
  highlights_en text[] not null default '{}',
  highlights_ru text[] not null default '{}',
  has_metro boolean not null default false,
  price_psf numeric not null,          -- average apartment sale price, AED per sq ft
  service_charge_psf numeric not null, -- AED per sq ft per year
  growth_pct numeric not null,         -- default annual price growth assumption
  source text,
  updated_at date not null default current_date
);

create table if not exists public.area_rents (
  area_id text references public.areas(id) on delete cascade,
  bedrooms int not null,               -- 0 = studio
  annual_rent numeric not null,
  primary key (area_id, bedrooms)
);

create table if not exists public.developers (
  id text primary key,
  name text not null,
  resale_threshold_pct numeric not null,
  noc_fee numeric not null,
  assignment_fee numeric not null default 0,
  notes text,
  sort int default 100
);

create table if not exists public.fee_settings (
  key text primary key,
  value numeric not null,
  description text
);

create table if not exists public.calculations (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null references auth.users(id) on delete cascade,
  client_name text default '',
  deal_type text not null check (deal_type in ('offplan','secondary')),
  area_id text references public.areas(id),
  inputs jsonb not null,
  share_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists calculations_broker_idx on public.calculations(broker_id, created_at desc);

-- Profile row on sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Row level security
alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.area_rents enable row level security;
alter table public.developers enable row level security;
alter table public.fee_settings enable row level security;
alter table public.calculations enable row level security;

create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

create policy "ref read areas"      on public.areas        for select to authenticated using (true);
create policy "ref read rents"      on public.area_rents   for select to authenticated using (true);
create policy "ref read developers" on public.developers   for select to authenticated using (true);
create policy "ref read fees"       on public.fee_settings for select to authenticated using (true);

create policy "own calcs select" on public.calculations for select using (auth.uid() = broker_id);
create policy "own calcs insert" on public.calculations for insert with check (auth.uid() = broker_id);
create policy "own calcs update" on public.calculations for update using (auth.uid() = broker_id);
create policy "own calcs delete" on public.calculations for delete using (auth.uid() = broker_id);

-- Logos: public read, each broker writes only into their own folder (<user_id>/...)
insert into storage.buckets (id, name, public) values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "branding public read" on storage.objects for select using (bucket_id = 'branding');
create policy "branding own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "branding own update" on storage.objects for update to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
