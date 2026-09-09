-- Book Friends — run this once in Supabase: SQL Editor -> New query -> paste -> Run

create extension if not exists pgcrypto;

-- One row per person. Lists live here as JSON so friends can read them in one fetch.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '',
  tagline text not null default '',
  avatar text not null default 'A',
  accent text not null default 'green',
  categories jsonb not null default '[]'::jsonb,      -- [{name, custom, books:[{title, author, excited}]}]
  recommendations jsonb not null default '[]'::jsonb, -- [{id, title, author, note}]
  badges jsonb not null default '[]'::jsonb,          -- [{key, at}]
  months_updated jsonb not null default '[]'::jsonb,  -- ["2026-09", ...]
  recs_read jsonb not null default '[]'::jsonb,       -- ["<ownerUsername>:<recId>", ...]
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references profiles(id) on delete cascade,
  addressee uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee)
);

-- Private: only the owner can ever read their history.
create table if not exists history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  month text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

-- "Your friend updated their shelf" notices.
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,  -- who receives it
  actor_id uuid not null references profiles(id) on delete cascade, -- who did the thing
  kind text not null,      -- 'shelf' | 'friend_request' | 'friend_accepted' | 'badge'
  detail text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table friendships enable row level security;
alter table history enable row level security;
alter table notices enable row level security;

-- Profiles: anyone signed in can read (needed to find friends and see their shelves); you edit only yours.
create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles insert own" on profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on profiles for update to authenticated using (auth.uid() = id);

-- Friendships: you see the ones you're part of; you can request; the addressee can accept; either side can remove.
create policy "friendships read" on friendships for select to authenticated
  using (auth.uid() = requester or auth.uid() = addressee);
create policy "friendships request" on friendships for insert to authenticated
  with check (auth.uid() = requester and requester <> addressee);
create policy "friendships accept" on friendships for update to authenticated
  using (auth.uid() = addressee);
create policy "friendships remove" on friendships for delete to authenticated
  using (auth.uid() = requester or auth.uid() = addressee);

-- History: owner only.
create policy "history own" on history for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notices: you read and mark your own; anyone signed in can create one where they are the actor.
create policy "notices read own" on notices for select to authenticated using (auth.uid() = user_id);
create policy "notices update own" on notices for update to authenticated using (auth.uid() = user_id);
create policy "notices create as actor" on notices for insert to authenticated with check (auth.uid() = actor_id);
create policy "notices delete own" on notices for delete to authenticated using (auth.uid() = user_id);

-- Lets the app look up a username -> email for login without exposing anything else.
create or replace function username_email(u text) returns text
language sql security definer stable as $$
  select lower(u) || '@shelfmates.app';
$$;
