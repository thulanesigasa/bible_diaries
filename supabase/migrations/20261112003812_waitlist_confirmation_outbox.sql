-- No backfill: only new waiting-list requests create a one-time receipt job.
CREATE TABLE private.waitlist_confirmation_outbox(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text UNIQUE NOT NULL REFERENCES public.bible_diaries_waitlist(email) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','processing','sent','failed')),
 created_at timestamptz NOT NULL DEFAULT now(), available_at timestamptz NOT NULL DEFAULT now(),
 first_attempt_at timestamptz,last_attempt_at timestamptz,locked_until timestamptz,lease uuid,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 6),
 sent_at timestamptz,provider_id text,error_code text
);
CREATE TABLE private.waitlist_mail_budget(day date PRIMARY KEY,attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 100));
ALTER TABLE private.waitlist_confirmation_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.waitlist_mail_budget ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.waitlist_confirmation_outbox,private.waitlist_mail_budget FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT ALL ON private.waitlist_confirmation_outbox,private.waitlist_mail_budget TO service_role;
CREATE INDEX waitlist_mail_due ON private.waitlist_confirmation_outbox(available_at,created_at) WHERE status IN('pending','processing');
CREATE FUNCTION private.enqueue_waitlist_confirmation() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN INSERT INTO private.waitlist_confirmation_outbox(email) VALUES(NEW.email) ON CONFLICT(email) DO NOTHING; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION private.enqueue_waitlist_confirmation() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.enqueue_waitlist_confirmation() TO service_role;
CREATE TRIGGER queue_waitlist_confirmation AFTER INSERT ON public.bible_diaries_waitlist FOR EACH ROW EXECUTE FUNCTION private.enqueue_waitlist_confirmation();

CREATE FUNCTION public.claim_waitlist_confirmation(p_daily_limit integer DEFAULT 40) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE job private.waitlist_confirmation_outbox; slots integer; first_name text;
BEGIN
 -- Serializes the small global sending budget, including retries and concurrent workers.
 PERFORM pg_catalog.pg_advisory_xact_lock(981348217);
 UPDATE private.waitlist_confirmation_outbox SET status='failed',error_code='retry_window_expired',lease=NULL,locked_until=NULL
 WHERE status IN('pending','processing') AND (first_attempt_at<now()-interval '23 hours' OR attempts>=6) AND coalesce(locked_until,'-infinity')<=now();
 SELECT * INTO job FROM private.waitlist_confirmation_outbox WHERE available_at<=now()
 AND (status='pending' OR (status='processing' AND locked_until<=now()))
 AND attempts<6 ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 INSERT INTO private.waitlist_mail_budget AS b(day,attempts) VALUES((now() AT TIME ZONE 'UTC')::date,1)
 ON CONFLICT(day) DO UPDATE SET attempts=b.attempts+1 WHERE b.attempts<greatest(1,least(coalesce(p_daily_limit,40),100)) RETURNING attempts INTO slots;
 IF slots IS NULL THEN RETURN NULL; END IF;
 UPDATE private.waitlist_confirmation_outbox SET status='processing',lease=gen_random_uuid(),locked_until=now()+interval '5 minutes',
 attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),last_attempt_at=now() WHERE id=job.id RETURNING * INTO job;
 SELECT w.first_name INTO first_name FROM public.bible_diaries_waitlist w WHERE w.email=job.email;
 RETURN jsonb_build_object('id',job.id,'email',job.email,'first_name',first_name,'lease',job.lease,'attempts',job.attempts);
END $$;
CREATE FUNCTION public.finish_waitlist_confirmation(p_id uuid,p_lease uuid,p_outcome text,p_provider_id text DEFAULT NULL,p_retry_seconds integer DEFAULT 300) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE affected integer;
BEGIN
 IF p_outcome NOT IN('sent','retry','failed') THEN RAISE EXCEPTION 'Invalid mail outcome'; END IF;
 UPDATE private.waitlist_confirmation_outbox SET
 status=CASE WHEN p_outcome='sent' THEN 'sent' WHEN p_outcome='failed' OR attempts>=6 OR first_attempt_at<now()-interval '23 hours' THEN 'failed' ELSE 'pending' END,
 sent_at=CASE WHEN p_outcome='sent' THEN now() ELSE NULL END,
 provider_id=CASE WHEN p_outcome='sent' THEN left(p_provider_id,200) ELSE NULL END,
 error_code=CASE WHEN p_outcome='sent' THEN NULL ELSE p_outcome END,
 available_at=now()+make_interval(secs=>greatest(60,least(coalesce(p_retry_seconds,300),21600))),lease=NULL,locked_until=NULL
 WHERE id=p_id AND lease=p_lease AND status='processing';
 GET DIAGNOSTICS affected=ROW_COUNT;RETURN affected=1;
END $$;
REVOKE ALL ON FUNCTION public.claim_waitlist_confirmation(integer),public.finish_waitlist_confirmation(uuid,uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_waitlist_confirmation(integer),public.finish_waitlist_confirmation(uuid,uuid,text,text,integer) TO service_role;
