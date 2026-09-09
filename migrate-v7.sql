-- Shelfmates v7: several pets per person; "pet" stays the one shown on the profile
alter table profiles add column if not exists pets jsonb not null default '[]'::jsonb;
update profiles set pets = jsonb_build_array(pet || jsonb_build_object('id', substr(md5(random()::text), 1, 8)))
  where pet is not null and (pets is null or pets = '[]'::jsonb);
update profiles set pet = pets->0 where pet is not null and pets <> '[]'::jsonb;
