-- Shelfmates v2 migration: currency, XP, pets, photo, banner, monthly reminder, image storage
alter table profiles
  add column if not exists photo_url text,
  add column if not exists banner text not null default 'plain',
  add column if not exists coins integer not null default 0,
  add column if not exists coins_earned integer not null default 0,
  add column if not exists xp integer not null default 0,
  add column if not exists pet jsonb,
  add column if not exists last_reminded_month text,
  add column if not exists stats jsonb not null default '{}'::jsonb;

-- Public image bucket for profile photos and book covers. Each user writes only inside their own folder.
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do nothing;
drop policy if exists "images read" on storage.objects;
drop policy if exists "images insert own" on storage.objects;
drop policy if exists "images update own" on storage.objects;
drop policy if exists "images delete own" on storage.objects;
create policy "images read" on storage.objects for select using (bucket_id = 'images');
create policy "images insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images update own" on storage.objects for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
