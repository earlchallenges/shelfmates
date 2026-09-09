-- Shelfmates v3: shared title suggestions + let senders see their own sent notices (for daily caps)
create or replace function all_titles()
returns table(title text, author text, kind text, cover text, uses int)
language sql security definer stable as $$
  with b as (
    select bk->>'title' as title, bk->>'author' as author, coalesce(bk->>'kind','book') as kind, bk->>'cover' as cover
    from profiles p, jsonb_array_elements(p.categories) c, jsonb_array_elements(c->'books') bk
    union all
    select r->>'title', r->>'author', coalesce(r->>'kind','book'), r->>'cover'
    from profiles p, jsonb_array_elements(p.recommendations) r
  )
  select min(title), max(nullif(author,'')), min(kind), max(cover), count(*)::int
  from b where coalesce(title,'') <> ''
  group by lower(title) order by count(*) desc, min(title) limit 2000;
$$;
grant execute on function all_titles() to authenticated;
drop policy if exists "notices read sent" on notices;
create policy "notices read sent" on notices for select to authenticated using (auth.uid() = actor_id);
