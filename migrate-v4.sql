-- Shelfmates v4: avatar frames earned by level
alter table profiles add column if not exists frame text not null default 'none';
