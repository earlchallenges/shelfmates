-- Shelfmates v9: reading log (My Books), notes/quotes/journal per book with public/private, content flags
alter table profiles add column if not exists reading_log jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists agreed_terms_at timestamptz;

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_title text not null,
  book_author text not null default '',
  kind text not null default 'note' check (kind in ('quote','note','thought','journal')),
  body text not null,
  public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table notes enable row level security;
drop policy if exists "notes read own or public" on notes;
drop policy if exists "notes insert own" on notes;
drop policy if exists "notes update own" on notes;
drop policy if exists "notes delete own" on notes;
create policy "notes read own or public" on notes for select to authenticated using (auth.uid() = user_id or public = true);
create policy "notes insert own" on notes for insert to authenticated with check (auth.uid() = user_id);
create policy "notes update own" on notes for update to authenticated using (auth.uid() = user_id);
create policy "notes delete own" on notes for delete to authenticated using (auth.uid() = user_id);
