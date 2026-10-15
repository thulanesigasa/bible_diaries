-- Bible Diaries launch waitlist. Run once in the Bible Diaries Supabase project.
-- Independent from app accounts, profiles and diaries. No public read/write grants.
begin;
create table public.bible_diaries_waitlist (
  email text primary key check (email = lower(btrim(email)) and length(email) between 3 and 254),
  platform text not null check (platform in ('android', 'huawei', 'ios', 'any')),
  consented_at timestamptz not null default now(),
  notice_version text not null default '2026-10-15'
);
create table public.bible_diaries_waitlist_limits (
  ip_hash text primary key check (ip_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 6)
);
create index bible_diaries_waitlist_limits_window_idx on public.bible_diaries_waitlist_limits (window_start);
alter table public.bible_diaries_waitlist enable row level security;
alter table public.bible_diaries_waitlist_limits enable row level security;
revoke all on public.bible_diaries_waitlist, public.bible_diaries_waitlist_limits from public, anon, authenticated;
grant select, insert, update, delete on public.bible_diaries_waitlist, public.bible_diaries_waitlist_limits to service_role;

create function public.bible_diaries_join_waitlist(p_email text, p_platform text, p_consent boolean, p_ip_hash text)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_attempts integer;
begin
  if p_consent is distinct from true or v_email is null or length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_platform is null or p_platform not in ('android', 'huawei', 'ios', 'any')
    or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid waitlist submission' using errcode = '22023';
  end if;

  delete from public.bible_diaries_waitlist_limits where window_start < now() - interval '1 day';
  insert into public.bible_diaries_waitlist_limits as limits (ip_hash, window_start, attempts)
    values (p_ip_hash, now(), 1)
    on conflict (ip_hash) do update set
      attempts = case when limits.window_start <= now() - interval '15 minutes' then 1 else least(limits.attempts + 1, 6) end,
      window_start = case when limits.window_start <= now() - interval '15 minutes' then now() else limits.window_start end
    returning attempts into v_attempts;
  if v_attempts > 5 then return 'rate_limited'; end if;

  insert into public.bible_diaries_waitlist (email, platform)
    values (v_email, p_platform) on conflict (email) do nothing;
  return 'accepted';
end;
$$;
revoke all on function public.bible_diaries_join_waitlist(text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.bible_diaries_join_waitlist(text, text, boolean, text) to service_role;
commit;
