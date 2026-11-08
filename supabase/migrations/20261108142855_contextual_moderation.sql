-- Only the authenticated moderation service can submit trusted decisions.
-- Moderator identity is provisioned separately; user metadata grants no access.
CREATE TABLE private.moderation_memberships(user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, role text NOT NULL CHECK(role IN('moderator','safety_reviewer')));
CREATE TABLE private.moderation_submissions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 target text NOT NULL CHECK(target IN('diaries','comments','chats')), operation text NOT NULL CHECK(operation IN('insert','update')),
 row_id uuid, record jsonb, base_record jsonb, private_content boolean NOT NULL, consented boolean NOT NULL DEFAULT false,
 decision text NOT NULL CHECK(decision IN('ALLOW','REVIEW','REJECT')), reason text NOT NULL, policy_version text NOT NULL,
 categories jsonb NOT NULL, status text NOT NULL CHECK(status IN('published','pending','rejected','appealed','withdrawn')),
 version integer NOT NULL DEFAULT 1, appeal_count integer NOT NULL DEFAULT 0, request_key text NOT NULL,
 published_data jsonb, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
CREATE INDEX ON private.moderation_submissions(owner_id,created_at DESC);
CREATE INDEX ON private.moderation_submissions(status,created_at);
CREATE INDEX ON private.moderation_submissions(owner_id,request_key,created_at DESC);
CREATE TABLE private.moderation_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, submission_id uuid NOT NULL REFERENCES private.moderation_submissions ON DELETE CASCADE, actor_id uuid REFERENCES auth.users ON DELETE SET NULL, action text NOT NULL, note text CHECK(length(note)<=500), created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.moderation_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.moderation_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.moderation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.moderation_memberships,private.moderation_submissions,private.moderation_audit FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.moderation_snapshot(actor uuid,target text,row_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 IF target='diaries' THEN
  PERFORM 1 FROM public.diaries WHERE id=row_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.diary_owners WHERE post_id=row_id AND user_id=actor) THEN RAISE EXCEPTION 'Edit not permitted';END IF;
  SELECT jsonb_build_object('content',content,'title',title,'scripture',scripture) INTO result FROM public.diaries WHERE id=row_id;
 ELSIF target='comments' THEN
  PERFORM 1 FROM public.comments WHERE id=row_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.comment_owners WHERE comment_id=row_id AND user_id=actor) THEN RAISE EXCEPTION 'Edit not permitted';END IF;
  SELECT jsonb_build_object('content',content) INTO result FROM public.comments WHERE id=row_id;
 ELSE RAISE EXCEPTION 'Invalid edit';END IF;
 IF result IS NULL THEN RAISE EXCEPTION 'Content unavailable';END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.moderation_snapshot(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.moderated_submit(actor uuid,target text,operation text,record jsonb,row_id uuid,decision text,reason text,policy_version text,categories jsonb,base_record jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item private.moderation_submissions; fingerprint text; hidden boolean:=true; existing jsonb; result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users u JOIN auth.sessions s ON s.user_id=u.id WHERE u.id=actor AND (u.banned_until IS NULL OR u.banned_until<now())) THEN RAISE EXCEPTION 'Account unavailable';END IF;
 IF target NOT IN('diaries','comments','chats') OR operation NOT IN('insert','update') OR decision NOT IN('ALLOW','REVIEW','REJECT') OR reason NOT IN('allow','context','wellbeing','severe_safety','targeted_abuse','child_safety') OR length(policy_version)>80 OR jsonb_typeof(categories)<>'array' THEN RAISE EXCEPTION 'Invalid moderation decision';END IF;
 IF operation='update' THEN existing=private.moderation_snapshot(actor,target,row_id);IF existing IS DISTINCT FROM base_record THEN RAISE EXCEPTION 'Content changed. Reload before editing';END IF;END IF;
 IF target='diaries' THEN
  IF operation='insert' THEN hidden=coalesce(record->>'visibility','public')='private';
  ELSE SELECT visibility='private' INTO hidden FROM public.diaries WHERE id=row_id;END IF;
 ELSIF target='comments' THEN
  IF operation='insert' THEN SELECT visibility='private' INTO hidden FROM public.diaries WHERE id=(record->>'post_id')::uuid;
  ELSE SELECT d.visibility='private' INTO hidden FROM public.comments c JOIN public.diaries d ON d.id=c.post_id WHERE c.id=row_id;END IF;
 END IF;
 hidden=coalesce(hidden,true);
 fingerprint=md5(jsonb_build_array(target,operation,row_id,record,base_record)::text);
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||fingerprint,0));
 SELECT * INTO item FROM private.moderation_submissions s WHERE s.owner_id=actor AND s.request_key=fingerprint AND s.expires_at>now() AND (s.created_at>now()-interval '5 minutes' OR s.status IN('pending','appealed','rejected')) AND s.status<>'withdrawn' ORDER BY s.created_at DESC LIMIT 1;
 IF item.id IS NOT NULL THEN RETURN jsonb_build_object('id',item.id,'decision',CASE WHEN item.status='published' THEN 'ALLOW' ELSE item.decision END,'reason',item.reason,'private_content',item.private_content,'data',item.published_data);END IF;
 IF decision='ALLOW' THEN result=private.commit_content(actor,target,operation,record,row_id);END IF;
 INSERT INTO private.moderation_submissions(owner_id,target,operation,record,row_id,base_record,private_content,decision,reason,policy_version,categories,status,request_key,published_data)
 VALUES(actor,target,operation,CASE WHEN reason='child_safety' OR decision='ALLOW' THEN NULL ELSE record END,row_id,base_record,hidden,decision,reason,policy_version,categories,CASE decision WHEN 'ALLOW' THEN 'published' WHEN 'REVIEW' THEN 'pending' ELSE 'rejected' END,fingerprint,result) RETURNING * INTO item;
 INSERT INTO private.moderation_audit(submission_id,action) VALUES(item.id,'automated_'||lower(decision));
 -- Opportunistic bounded retention, plus the documented scheduled cleanup RPC.
 DELETE FROM private.moderation_submissions WHERE id IN(SELECT id FROM private.moderation_submissions WHERE expires_at<now() LIMIT 100);
 RETURN jsonb_build_object('id',item.id,'decision',decision,'reason',reason,'private_content',hidden,'data',result);
END $$;
REVOKE ALL ON FUNCTION private.moderated_submit(uuid,text,text,jsonb,uuid,text,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.moderated_submit(uuid,text,text,jsonb,uuid,text,text,text,jsonb,jsonb) TO service_role;
CREATE FUNCTION public.moderated_submit(actor uuid,target text,operation text,record jsonb,row_id uuid,decision text,reason text,policy_version text,categories jsonb,base_record jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.moderated_submit(actor,target,operation,record,row_id,decision,reason,policy_version,categories,base_record) $$;
REVOKE ALL ON FUNCTION public.moderated_submit(uuid,text,text,jsonb,uuid,text,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.moderated_submit(uuid,text,text,jsonb,uuid,text,text,text,jsonb,jsonb) TO service_role;
-- Retire the old unmoderated publication RPC after this migration. The new
-- transaction and authorised review actions invoke its private implementation.
REVOKE EXECUTE ON FUNCTION public.commit_content(uuid,text,text,jsonb,uuid),private.commit_content(uuid,text,text,jsonb,uuid) FROM service_role;

CREATE FUNCTION private.moderation_list(queue boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=auth.uid(); staff text;
BEGIN
 IF NOT private.active_member() THEN RAISE EXCEPTION 'Sign in again';END IF;
 SELECT role INTO staff FROM private.moderation_memberships WHERE user_id=actor;
 IF queue AND staff IS NULL THEN RAISE EXCEPTION 'Moderator access required';END IF;
 RETURN coalesce((SELECT jsonb_agg(x) FROM (
 SELECT s.id,s.target,s.operation,s.row_id,s.status,s.version,s.reason,s.policy_version,s.categories,s.created_at,s.expires_at,s.private_content,s.consented,
 CASE WHEN NOT queue THEN s.record ELSE s.record-'receiver_id'-'post_id'-'parent_id' END AS record,
 CASE WHEN NOT queue THEN s.appeal_count END AS appeal_count,
 (SELECT a.note FROM private.moderation_audit a WHERE a.submission_id=s.id AND a.action IN('approved','rejected') ORDER BY a.id DESC LIMIT 1) AS reviewer_note,
 (SELECT a.note FROM private.moderation_audit a WHERE a.submission_id=s.id AND a.action='appeal' ORDER BY a.id DESC LIMIT 1) AS appeal_note,
 (SELECT max(a.created_at) FROM private.moderation_audit a WHERE a.submission_id=s.id AND a.action IN('approved','rejected')) AS reviewed_at
 FROM private.moderation_submissions s WHERE s.expires_at>now() AND
 CASE WHEN NOT queue THEN s.owner_id=actor AND (s.status<>'published' OR s.decision<>'ALLOW')
 ELSE s.owner_id<>actor AND s.status IN('pending','appealed') AND s.reason<>'child_safety' AND (NOT s.private_content OR (staff='safety_reviewer' AND s.consented)) END
 ORDER BY s.created_at DESC LIMIT 100) x),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION private.moderation_list(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.moderation_list(boolean) TO authenticated;
CREATE FUNCTION public.moderation_list(queue boolean DEFAULT false) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.moderation_list(queue) $$;
REVOKE ALL ON FUNCTION public.moderation_list(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderation_list(boolean) TO authenticated;

CREATE FUNCTION private.moderation_action(submission uuid,expected_version integer,action text,note text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
  IF staff IS NULL OR item.owner_id=actor OR item.status NOT IN('pending','appealed') OR item.reason='child_safety' OR (item.private_content AND (staff<>'safety_reviewer' OR NOT item.consented)) THEN RAISE EXCEPTION 'Review not permitted';END IF;
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
CREATE FUNCTION public.moderation_action(submission uuid,expected_version integer,action text,note text DEFAULT '') RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.moderation_action(submission,expected_version,action,note) $$;
REVOKE ALL ON FUNCTION public.moderation_action(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderation_action(uuid,integer,text,text) TO authenticated;

CREATE FUNCTION private.moderation_stats() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT private.active_member() OR NOT EXISTS(SELECT 1 FROM private.moderation_memberships WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Moderator access required';END IF;
 -- No per-user, private-content or small-group breakdowns.
 RETURN (SELECT coalesce(jsonb_object_agg(status,n),'{}') FROM (SELECT status,count(*) n FROM private.moderation_submissions WHERE NOT private_content AND expires_at>now() GROUP BY status) x);
END $$;
REVOKE ALL ON FUNCTION private.moderation_stats() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.moderation_stats() TO authenticated;
CREATE FUNCTION public.moderation_stats() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.moderation_stats() $$;
REVOKE ALL ON FUNCTION public.moderation_stats() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderation_stats() TO authenticated;

CREATE FUNCTION private.cleanup_moderation() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n integer;BEGIN DELETE FROM private.moderation_submissions WHERE expires_at<now();GET DIAGNOSTICS n=ROW_COUNT;RETURN n;END $$;
REVOKE ALL ON FUNCTION private.cleanup_moderation() FROM PUBLIC,anon,authenticated,service_role;
-- Schedule with pg_cron only when that extension is already installed.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN PERFORM cron.schedule('diary-moderation-retention','17 2 * * *','select private.cleanup_moderation()');END IF;END $$;
NOTIFY pgrst,'reload schema';
