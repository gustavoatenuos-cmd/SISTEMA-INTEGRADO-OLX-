create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id text not null unique check (char_length(ad_id) between 1 and 19),
  title text not null default '',
  brand text not null default '',
  model text not null default '',
  version text not null default '',
  brand_id text not null default '',
  model_id text not null default '',
  version_id text not null default '',
  year integer not null default 2024,
  mileage integer not null default 0,
  price integer not null default 0,
  phone text not null default '',
  zipcode text not null default '',
  city text not null default 'Londrina',
  state text not null default 'PR',
  plate text not null default '',
  fuel text not null default '',
  gearbox text not null default '',
  color text not null default '',
  doors text not null default '',
  description text not null default '',
  youtube_url text not null default '',
  images text[] not null default '{}',
  target_cities jsonb not null default '[]'::jsonb,
  features text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','pending','published','refused','sold','removed')),
  pending_operation text check (pending_operation in ('insert','delete')),
  import_token text,
  olx_list_id text,
  olx_url text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint max_target_cities check (jsonb_typeof(target_cities)='array' and jsonb_array_length(target_cities) <= 14)
);
create index if not exists idx_vehicles_user_created on public.vehicles(user_id,created_at desc);
alter table public.vehicles enable row level security;
drop policy if exists "vehicles_select_own" on public.vehicles;
create policy "vehicles_select_own" on public.vehicles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "vehicles_insert_own" on public.vehicles;
create policy "vehicles_insert_own" on public.vehicles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "vehicles_update_own" on public.vehicles;
create policy "vehicles_update_own" on public.vehicles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "vehicles_delete_own" on public.vehicles;
create policy "vehicles_delete_own" on public.vehicles for delete to authenticated using ((select auth.uid()) = user_id);

-- Apenas o backend com service_role acessa credenciais e estados OAuth.
create table if not exists public.olx_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  connected_at timestamptz not null default now()
);
alter table public.olx_connections enable row level security;
revoke all on table public.olx_connections from anon, authenticated;

create table if not exists public.olx_oauth_states (
  state uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists idx_olx_states_expiry on public.olx_oauth_states(expires_at);
alter table public.olx_oauth_states enable row level security;
revoke all on table public.olx_oauth_states from anon, authenticated;

-- Leitura pública das fotos é necessária para importação pela OLX.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('olx-vehicle-images','olx-vehicle-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "vehicle_photos_insert_own" on storage.objects;
create policy "vehicle_photos_insert_own" on storage.objects for insert to authenticated
with check(bucket_id='olx-vehicle-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "vehicle_photos_update_own" on storage.objects;
create policy "vehicle_photos_update_own" on storage.objects for update to authenticated
using(bucket_id='olx-vehicle-images' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='olx-vehicle-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "vehicle_photos_delete_own" on storage.objects;
create policy "vehicle_photos_delete_own" on storage.objects for delete to authenticated
using(bucket_id='olx-vehicle-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
grant select,insert,update,delete on public.vehicles to authenticated;
