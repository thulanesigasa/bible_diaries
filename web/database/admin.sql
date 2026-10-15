-- Run after waitlist.sql in the Bible Diaries project. Aggregate-only admin access.
begin;
create table public.bible_diaries_admin_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 21)
);
create index bible_diaries_admin_limits_window_idx on public.bible_diaries_admin_limits(window_start);
alter table public.bible_diaries_admin_limits enable row level security;
revoke all on public.bible_diaries_admin_limits from public, anon, authenticated;
grant select, insert, update, delete on public.bible_diaries_admin_limits to service_role;

create function public.bible_diaries_admin_login_attempt(p_ip_hash text, p_email_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer; k text; maximum integer;
begin
  if p_ip_hash is null or p_email_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' or p_email_hash !~ '^[a-f0-9]{64}$' or p_ip_hash = p_email_hash then
    raise exception 'Invalid rate-limit key' using errcode = '22023';
  end if;
  delete from public.bible_diaries_admin_limits where window_start < now() - interval '1 day';
  foreach k in array array[p_ip_hash,p_email_hash] loop
    maximum := case when k = p_ip_hash then 20 else 5 end;
    insert into public.bible_diaries_admin_limits as limits(key_hash,window_start,attempts) values(k,now(),1)
    on conflict(key_hash) do update set
      attempts = case when limits.window_start <= now() - interval '15 minutes' then 1 else least(limits.attempts + 1,21) end,
      window_start = case when limits.window_start <= now() - interval '15 minutes' then now() else limits.window_start end
    returning attempts into n;
    if n > maximum then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.bible_diaries_admin_login_attempt(text,text) from public,anon,authenticated;
grant execute on function public.bible_diaries_admin_login_attempt(text,text) to service_role;

create function public.bible_diaries_waitlist_stats()
returns jsonb language sql stable security invoker set search_path = '' as $$
  with clock as (
    select (now() at time zone 'Africa/Johannesburg')::date as today
  ), records as (
    select platform, consented_at, (consented_at at time zone 'Africa/Johannesburg')::date as day
    from public.bible_diaries_waitlist
  ), daily as (
    select to_char(series.day,'YYYY-MM-DD') as date, count(records.consented_at)::integer as count
    from clock cross join lateral generate_series(clock.today - 29, clock.today, interval '1 day') as series(day)
    left join records on records.day = series.day::date
    group by series.day order by series.day
  )
  select jsonb_build_object(
    'total',(select count(*) from records),
    'today',(select count(*) from records,clock where records.day = clock.today),
    'last7Days',(select count(*) from records,clock where records.day between clock.today - 6 and clock.today),
    'last30Days',(select count(*) from records,clock where records.day between clock.today - 29 and clock.today),
    'latestSignup',(select max(consented_at) from records),
    'updatedAt',now(), 'timezone','Africa/Johannesburg',
    'platforms',jsonb_build_object(
      'android',(select count(*) from records where platform = 'android'),
      'huawei',(select count(*) from records where platform = 'huawei'),
      'ios',(select count(*) from records where platform = 'ios'),
      'any',(select count(*) from records where platform = 'any')
    ),
    'daily',(select jsonb_agg(jsonb_build_object('date',date,'count',count) order by date) from daily)
  );
$$;
revoke all on function public.bible_diaries_waitlist_stats() from public,anon,authenticated;
grant execute on function public.bible_diaries_waitlist_stats() to service_role;
commit;
