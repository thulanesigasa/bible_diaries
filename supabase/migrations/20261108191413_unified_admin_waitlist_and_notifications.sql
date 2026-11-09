-- Align signup records and application review notifications. Apply after contextual moderation.
-- Bible Diaries launch waitlist. Run once in the Bible Diaries Supabase project.
-- Independent from app accounts, profiles and diaries. No public read/write grants.

create table if not exists public.bible_diaries_waitlist (
  email text primary key check (email = lower(btrim(email)) and length(email) between 3 and 254),
  platform text not null check (platform in ('android', 'huawei', 'ios', 'any')),
  consented_at timestamptz not null default now(),
  notice_version text not null default '2026-10-15'
);
create table if not exists public.bible_diaries_waitlist_limits (
  ip_hash text primary key check (ip_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 6)
);
create index if not exists bible_diaries_waitlist_limits_window_idx on public.bible_diaries_waitlist_limits (window_start);
alter table public.bible_diaries_waitlist enable row level security;
alter table public.bible_diaries_waitlist_limits enable row level security;
revoke all on public.bible_diaries_waitlist, public.bible_diaries_waitlist_limits from public, anon, authenticated;
grant select, insert, update, delete on public.bible_diaries_waitlist, public.bible_diaries_waitlist_limits to service_role;

create or replace function public.bible_diaries_join_waitlist(p_email text, p_platform text, p_consent boolean, p_ip_hash text)
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


-- Run after waitlist.sql in the Bible Diaries project. Aggregate-only admin access.

create table if not exists public.bible_diaries_admin_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 21)
);
create index if not exists bible_diaries_admin_limits_window_idx on public.bible_diaries_admin_limits(window_start);
alter table public.bible_diaries_admin_limits enable row level security;
revoke all on public.bible_diaries_admin_limits from public, anon, authenticated;
grant select, insert, update, delete on public.bible_diaries_admin_limits to service_role;

create or replace function public.bible_diaries_admin_login_attempt(p_ip_hash text, p_email_hash text)
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

create or replace function public.bible_diaries_waitlist_stats()
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

ALTER TABLE public.bible_diaries_waitlist ADD COLUMN IF NOT EXISTS first_name varchar(80);
ALTER TABLE public.bible_diaries_waitlist ADD COLUMN IF NOT EXISTS surname varchar(80);
ALTER TABLE public.bible_diaries_waitlist ADD COLUMN IF NOT EXISTS phone_e164 text CHECK(phone_e164 ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE public.bible_diaries_waitlist ADD COLUMN IF NOT EXISTS phone_country text CHECK(phone_country ~ '^[A-Z]{2}$');
ALTER TABLE public.bible_diaries_waitlist ADD COLUMN IF NOT EXISTS gender text CHECK(gender IN('male','female'));
CREATE INDEX IF NOT EXISTS bible_diaries_waitlist_joined_idx ON public.bible_diaries_waitlist(consented_at DESC,email);
CREATE FUNCTION public.bible_diaries_join_waitlist_v2(p_email text,p_platform text,p_consent boolean,p_ip_hash text,p_first_name text,p_surname text,p_phone text,p_phone_country text,p_gender text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_email text:=lower(btrim(p_email));hits integer;
BEGIN
 IF p_consent IS DISTINCT FROM true OR v_email IS NULL OR length(v_email)>254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR p_platform IS NULL OR p_platform NOT IN('android','huawei','ios','any') OR p_ip_hash IS NULL OR p_ip_hash !~ '^[a-f0-9]{64}$' OR p_first_name IS NULL OR length(btrim(p_first_name)) NOT BETWEEN 1 AND 80 OR p_surname IS NULL OR length(btrim(p_surname)) NOT BETWEEN 1 AND 80 OR p_phone IS NULL OR p_phone !~ '^\+[1-9][0-9]{7,14}$' OR p_phone_country IS NULL OR p_phone_country !~ '^[A-Z]{2}$' OR p_gender IS NULL OR p_gender NOT IN('male','female') THEN RAISE EXCEPTION 'Invalid waiting-list request';END IF;
 DELETE FROM public.bible_diaries_waitlist_limits WHERE window_start<now()-interval '1 day';
 INSERT INTO public.bible_diaries_waitlist_limits AS limits(ip_hash,window_start,attempts) VALUES(p_ip_hash,now(),1)
 ON CONFLICT(ip_hash) DO UPDATE SET attempts=CASE WHEN limits.window_start<=now()-interval '15 minutes' THEN 1 ELSE least(limits.attempts+1,6) END,window_start=CASE WHEN limits.window_start<=now()-interval '15 minutes' THEN now() ELSE limits.window_start END RETURNING attempts INTO hits;
 IF hits>5 THEN RETURN 'rate_limited';END IF;
 INSERT INTO public.bible_diaries_waitlist(email,platform,notice_version,first_name,surname,phone_e164,phone_country,gender) VALUES(v_email,p_platform,'2026-11-08',btrim(p_first_name),btrim(p_surname),p_phone,p_phone_country,p_gender) ON CONFLICT DO NOTHING;
 RETURN 'accepted';
END $$;
REVOKE ALL ON FUNCTION public.bible_diaries_join_waitlist_v2(text,text,boolean,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bible_diaries_join_waitlist_v2(text,text,boolean,text,text,text,text,text,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.bible_diaries_join_waitlist(text,text,boolean,text) FROM service_role;

CREATE TABLE public.moderation_notifications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 submission_id uuid REFERENCES private.moderation_submissions ON DELETE SET NULL,
 outcome text NOT NULL CHECK(outcome IN('approved','rejected')),target text NOT NULL CHECK(target IN('diaries','comments','chats')),
 content_id uuid,reason text NOT NULL CHECK(length(reason)<=500),created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz,
 UNIQUE(submission_id,outcome)
);
ALTER TABLE public.moderation_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderation_notifications FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT(id,user_id,submission_id,outcome,target,content_id,reason,created_at,read_at),UPDATE(read_at) ON public.moderation_notifications TO authenticated;
CREATE POLICY moderation_notice_owner ON public.moderation_notifications FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT private.active_member()));
CREATE POLICY moderation_notice_read ON public.moderation_notifications FOR UPDATE TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT private.active_member())) WITH CHECK(user_id=(SELECT auth.uid()) AND (SELECT private.active_member()));
CREATE INDEX ON public.moderation_notifications(user_id,created_at DESC);
CREATE INDEX ON public.moderation_notifications(user_id) WHERE read_at IS NULL;
CREATE FUNCTION private.notify_moderation_decision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE s private.moderation_submissions;
BEGIN
 IF NEW.action NOT IN('approved','rejected') OR NEW.actor_id IS NULL THEN RETURN NEW;END IF;
 SELECT * INTO s FROM private.moderation_submissions WHERE id=NEW.submission_id;
 INSERT INTO public.moderation_notifications(user_id,submission_id,outcome,target,content_id,reason)
 VALUES(s.owner_id,s.id,NEW.action,s.target,CASE WHEN NEW.action='approved' THEN (s.published_data->>'id')::uuid ELSE NULL END,coalesce(NEW.note,'Review completed.'))
 ON CONFLICT(submission_id,outcome) DO UPDATE SET reason=EXCLUDED.reason,read_at=NULL,created_at=now();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.notify_moderation_decision() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER notify_moderation_decision AFTER INSERT ON private.moderation_audit FOR EACH ROW EXECUTE FUNCTION private.notify_moderation_decision();
NOTIFY pgrst,'reload schema';

-- Separate identities for the two administrator workspaces.
CREATE TABLE private.waitlist_admins(user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE);
ALTER TABLE private.waitlist_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.waitlist_admins FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.reject_overlapping_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF TG_TABLE_NAME='waitlist_admins' THEN
  IF EXISTS(SELECT 1 FROM private.moderation_memberships WHERE user_id=NEW.user_id) THEN RAISE EXCEPTION 'Use a separate waiting-list administrator account';END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM private.waitlist_admins WHERE user_id=NEW.user_id) THEN RAISE EXCEPTION 'Use a separate main-administrator account';END IF;
 END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.reject_overlapping_admin() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER separate_waitlist_admin BEFORE INSERT OR UPDATE ON private.waitlist_admins FOR EACH ROW EXECUTE FUNCTION private.reject_overlapping_admin();
CREATE TRIGGER separate_main_admin BEFORE INSERT OR UPDATE ON private.moderation_memberships FOR EACH ROW EXECUTE FUNCTION private.reject_overlapping_admin();
CREATE FUNCTION private.waitlist_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT private.active_member() AND EXISTS(SELECT 1 FROM private.waitlist_admins WHERE user_id=auth.uid()) $$;
REVOKE ALL ON FUNCTION private.waitlist_is_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.waitlist_is_admin() TO authenticated;
CREATE FUNCTION public.waitlist_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.waitlist_is_admin() $$;
REVOKE ALL ON FUNCTION public.waitlist_is_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.waitlist_is_admin() TO authenticated;
NOTIFY pgrst,'reload schema';

-- Upgrade the installed moderation queue without rewriting its migration.
CREATE TABLE private.moderation_access_log(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid REFERENCES auth.users ON DELETE SET NULL,submission_id uuid REFERENCES private.moderation_submissions ON DELETE CASCADE,viewed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.moderation_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.moderation_access_log FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX ON private.moderation_access_log(submission_id,viewed_at);
CREATE OR REPLACE FUNCTION private.moderation_list(queue boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=auth.uid(); staff text; result jsonb;
BEGIN
 IF NOT private.active_member() THEN RAISE EXCEPTION 'Sign in again';END IF;
 SELECT role INTO staff FROM private.moderation_memberships WHERE user_id=actor;
 IF queue AND staff IS NULL THEN RAISE EXCEPTION 'Moderator access required';END IF;
 SELECT coalesce((SELECT jsonb_agg(x) FROM (
 SELECT s.id,s.target,s.operation,s.row_id,s.status,s.version,s.reason,s.policy_version,s.categories,s.created_at,s.expires_at,s.private_content,s.consented,
 CASE WHEN queue AND NOT s.private_content THEN jsonb_build_object('first_name',coalesce(p.first_name,p.full_name),'surname',p.surname,'email',u.email) ELSE NULL END AS author,
 CASE WHEN NOT queue THEN s.record ELSE s.record-'receiver_id'-'post_id'-'parent_id' END AS record,
 CASE WHEN NOT queue THEN s.appeal_count END AS appeal_count,
 (SELECT a.note FROM private.moderation_audit a WHERE a.submission_id=s.id AND a.action IN('approved','rejected') ORDER BY a.id DESC LIMIT 1) AS reviewer_note,
 (SELECT a.note FROM private.moderation_audit a WHERE a.submission_id=s.id AND a.action='appeal' ORDER BY a.id DESC LIMIT 1) AS appeal_note,
 (SELECT max(a.created_at) FROM private.moderation_audit a WHERE a.submission_id=s.id AND a.action IN('approved','rejected')) AS reviewed_at
 FROM private.moderation_submissions s LEFT JOIN public.profiles p ON p.id=s.owner_id LEFT JOIN auth.users u ON u.id=s.owner_id WHERE s.expires_at>now() AND
 CASE WHEN NOT queue THEN s.owner_id=actor AND (s.status<>'published' OR s.decision<>'ALLOW')
 ELSE s.owner_id<>actor AND (s.status IN('pending','appealed') OR (s.status='rejected' AND NOT EXISTS(SELECT 1 FROM private.moderation_audit a WHERE a.submission_id=s.id AND a.action='rejected'))) AND s.reason<>'child_safety' AND (NOT s.private_content OR (staff='safety_reviewer' AND s.consented)) END
 ORDER BY CASE WHEN queue THEN s.created_at END ASC,s.created_at DESC LIMIT 100) x),'[]'::jsonb) INTO result;
 IF queue THEN INSERT INTO private.moderation_access_log(actor_id,submission_id) SELECT actor,(v->>'id')::uuid FROM jsonb_array_elements(result) v;END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.moderation_list(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.moderation_list(boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.moderation_list(queue boolean DEFAULT false) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.moderation_list(queue) $$;
REVOKE ALL ON FUNCTION public.moderation_list(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderation_list(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION private.moderation_action(submission uuid,expected_version integer,action text,note text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=auth.uid();item private.moderation_submissions;staff text;result jsonb;
BEGIN
 IF NOT private.active_member() THEN RAISE EXCEPTION 'Sign in again';END IF;
 IF NOT private.consume_security_limit(actor,'content') THEN RAISE EXCEPTION 'Too many requests';END IF;
 IF length(note)>500 THEN RAISE EXCEPTION 'Keep the note under 500 characters';END IF;
 SELECT * INTO item FROM private.moderation_submissions WHERE id=submission FOR UPDATE;
 IF item.id IS NULL OR item.expires_at<now() THEN RAISE EXCEPTION 'Submission unavailable';END IF;
 IF item.version<>expected_version THEN RAISE EXCEPTION 'Submission changed. Refresh before continuing';END IF;
 IF action IN('withdraw','appeal','consent') THEN
  IF item.owner_id<>actor OR item.status NOT IN('pending','rejected','appealed') THEN RAISE EXCEPTION 'Action unavailable';END IF;
  IF action='appeal' AND (item.appeal_count>0 OR item.status<>'rejected' OR length(trim(note))<5) THEN RAISE EXCEPTION 'One reasoned appeal is available per rejection';END IF;
  IF action='consent' AND (NOT item.private_content OR item.reason='child_safety') THEN RAISE EXCEPTION 'Restricted review unavailable';END IF;
  UPDATE private.moderation_submissions SET status=CASE WHEN action='withdraw' THEN 'withdrawn' WHEN action='appeal' THEN 'appealed' ELSE status END,record=CASE WHEN action='withdraw' THEN NULL ELSE record END,consented=CASE WHEN action='consent' THEN true ELSE consented END,appeal_count=appeal_count+CASE WHEN action='appeal' THEN 1 ELSE 0 END,version=version+1 WHERE id=submission;
 ELSIF action IN('approve','reject') THEN
  SELECT role INTO staff FROM private.moderation_memberships WHERE user_id=actor;
  IF staff IS NULL OR item.owner_id=actor OR (item.status NOT IN('pending','appealed','rejected') OR (item.status='rejected' AND EXISTS(SELECT 1 FROM private.moderation_audit a WHERE a.submission_id=item.id AND a.action='rejected'))) OR item.reason='child_safety' OR (item.private_content AND (staff<>'safety_reviewer' OR NOT item.consented)) THEN RAISE EXCEPTION 'Review not permitted';END IF;
  IF length(trim(note))<5 THEN RAISE EXCEPTION 'Record a clear review reason';END IF;
  IF action='approve' THEN
   IF item.operation='update' AND private.moderation_snapshot(item.owner_id,item.target,item.row_id) IS DISTINCT FROM item.base_record THEN RAISE EXCEPTION 'Content changed. Ask the author to resubmit';END IF;
   result=private.commit_content(item.owner_id,item.target,item.operation,item.record,item.row_id);
  END IF;
  UPDATE private.moderation_submissions SET status=CASE WHEN action='approve' THEN 'published' ELSE 'rejected' END,record=CASE WHEN action='approve' THEN NULL ELSE record END,published_data=result,version=version+1 WHERE id=submission;
 ELSE RAISE EXCEPTION 'Invalid action';END IF;
 INSERT INTO private.moderation_audit(submission_id,actor_id,action,note) VALUES(submission,actor,CASE action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' ELSE action END,note);
 RETURN jsonb_build_object('success',true);
END $$;
REVOKE ALL ON FUNCTION private.moderation_action(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.moderation_action(uuid,integer,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.moderation_action(submission uuid,expected_version integer,action text,note text DEFAULT '') RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.moderation_action(submission,expected_version,action,note) $$;
REVOKE ALL ON FUNCTION public.moderation_action(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderation_action(uuid,integer,text,text) TO authenticated;


NOTIFY pgrst,'reload schema';
