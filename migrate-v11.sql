-- Shelfmates v11: to-be-read + reading progress, goals, room & pet corner, habit check-ins
alter table profiles
  add column if not exists tbr jsonb not null default '[]'::jsonb,
  add column if not exists goals jsonb not null default '[]'::jsonb,
  add column if not exists room jsonb not null default '{}'::jsonb,
  add column if not exists show_reading boolean not null default true;
