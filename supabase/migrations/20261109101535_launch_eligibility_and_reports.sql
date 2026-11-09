-- Eligibility is a server ledger, never an editable Auth metadata claim.
CREATE TABLE private.account_eligibility(
 user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
 birth_date date NOT NULL, policy_version text NOT NULL CHECK(policy_version='bd-launch-2026-11-09'), accepted_at timestamptz NOT NULL DEFAULT now(),
 guardian_email text, guardian_id uuid REFERENCES auth.users ON DELETE SET NULL,
 guardian_status text NOT NULL CHECK(guardian_status IN('not_required','pending','approved','revoked')),
 guardian_decided_at timestamptz, guardian_declaration text, version integer NOT NULL DEFAULT 1
);
CREATE INDEX eligibility_guardian_email ON private.account_eligibility(guardian_email) WHERE guardian_email IS NOT NULL;
CREATE INDEX eligibility_guardian_id ON private.account_eligibility(guardian_id) WHERE guardian_id IS NOT NULL;
ALTER TABLE private.account_eligibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.account_eligibility FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE private.guardian_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,child_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,actor_id uuid REFERENCES auth.users ON DELETE SET NULL,action text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON private.guardian_audit(child_id,created_at);
CREATE INDEX ON private.guardian_audit(actor_id);
ALTER TABLE private.guardian_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.guardian_audit FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.verified_session() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id WHERE u.id=auth.uid() AND s.id::text=auth.jwt()->>'session_id' AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<now()))
$$;
CREATE FUNCTION private.account_can_use(actor uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM private.account_eligibility e JOIN auth.users u ON u.id=e.user_id WHERE e.user_id=actor AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<now()) AND e.policy_version='bd-launch-2026-11-09' AND e.birth_date<=current_date-interval '13 years' AND (e.birth_date<=current_date-interval '18 years' OR (e.guardian_status='approved' AND EXISTS(SELECT 1 FROM auth.users g WHERE g.id=e.guardian_id AND lower(g.email)=e.guardian_email AND g.email_confirmed_at IS NOT NULL AND (g.banned_until IS NULL OR g.banned_until<now())))))
$$;
REVOKE ALL ON FUNCTION private.verified_session(),private.account_can_use(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.verified_session() TO authenticated;
REVOKE ALL ON FUNCTION private.account_can_use(uuid) FROM authenticated;
CREATE FUNCTION private.mfa_required() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' AND EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND status='verified') $$;
REVOKE ALL ON FUNCTION private.mfa_required() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION private.active_member() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT private.verified_session() AND private.account_can_use(auth.uid()) AND NOT private.mfa_required() $$;
-- Restricted members must still restore their session, manage consent and delete their account.
CREATE OR REPLACE FUNCTION public.session_is_active() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.verified_session() $$;
CREATE FUNCTION private.eligibility_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE e private.account_eligibility;
BEGIN
 IF NOT private.verified_session() THEN RAISE EXCEPTION 'Confirm your email and sign in again'; END IF;
 SELECT * INTO e FROM private.account_eligibility WHERE user_id=auth.uid();
 RETURN jsonb_build_object('ready',private.account_can_use(auth.uid()) AND NOT private.mfa_required(),'mfa_required',private.mfa_required(),'setup_required',e.user_id IS NULL,'guardian_status',e.guardian_status,'guardian_email',e.guardian_email,'policy_version',e.policy_version);
END $$;
CREATE FUNCTION private.complete_account_setup(birth_date date,guardian_email text,accepted boolean,policy_version text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=auth.uid(); mail text:=lower(trim(guardian_email)); own_mail text;
BEGIN
 IF NOT private.verified_session() THEN RAISE EXCEPTION 'Confirm your email and sign in again'; END IF;
 IF accepted IS DISTINCT FROM true OR policy_version IS DISTINCT FROM 'bd-launch-2026-11-09' THEN RAISE EXCEPTION 'Accept the current terms, privacy notice and community standards'; END IF;
 IF birth_date IS NULL OR birth_date>current_date-interval '13 years' OR birth_date<current_date-interval '120 years' THEN RAISE EXCEPTION 'Accounts are available from age 13'; END IF;
 SELECT lower(email) INTO own_mail FROM auth.users WHERE id=actor;
 IF birth_date>current_date-interval '18 years' AND (mail IS NULL OR length(mail)>254 OR mail!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' OR mail=own_mail) THEN RAISE EXCEPTION 'Provide a separate guardian email address'; END IF;
 INSERT INTO private.account_eligibility(user_id,birth_date,policy_version,guardian_email,guardian_status)
 VALUES(actor,birth_date,policy_version,CASE WHEN birth_date>current_date-interval '18 years' THEN mail END,CASE WHEN birth_date>current_date-interval '18 years' THEN 'pending' ELSE 'not_required' END);
 IF birth_date>current_date-interval '18 years' THEN UPDATE public.profiles SET privacy_mode='private' WHERE id=actor; END IF;
 INSERT INTO private.guardian_audit(child_id,actor_id,action) VALUES(actor,actor,'account_setup');
 RETURN private.eligibility_status();
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Account eligibility is already recorded. Contact support to correct it';
END $$;
CREATE FUNCTION private.guardian_requests() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT private.active_member() OR NOT EXISTS(SELECT 1 FROM private.account_eligibility WHERE user_id=auth.uid() AND birth_date<=current_date-interval '18 years') THEN RAISE EXCEPTION 'A verified adult account is required'; END IF;
 RETURN coalesce((SELECT jsonb_agg(x) FROM (SELECT e.user_id AS child_id,p.first_name,p.surname,e.guardian_status,e.accepted_at,e.version FROM private.account_eligibility e JOIN public.profiles p ON p.id=e.user_id WHERE e.birth_date>current_date-interval '18 years' AND e.guardian_email=(SELECT lower(email) FROM auth.users WHERE id=auth.uid()) ORDER BY e.accepted_at DESC LIMIT 100) x),'[]'::jsonb);
END $$;
CREATE FUNCTION private.guardian_decide(child_id uuid,approve boolean,declaration boolean,expected_version integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE e private.account_eligibility;actor uuid:=auth.uid();
BEGIN
 IF NOT private.active_member() OR NOT EXISTS(SELECT 1 FROM private.account_eligibility WHERE user_id=actor AND birth_date<=current_date-interval '18 years') THEN RAISE EXCEPTION 'A verified adult account is required'; END IF;
 IF declaration IS DISTINCT FROM true THEN RAISE EXCEPTION 'Confirm that you are authorised to act as this child’s guardian'; END IF;
 SELECT * INTO e FROM private.account_eligibility WHERE user_id=child_id FOR UPDATE;
 IF e.version IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'Guardian request changed. Refresh before deciding'; END IF;
 IF e.user_id IS NULL OR e.user_id=actor OR e.birth_date<=current_date-interval '18 years' OR e.guardian_email IS DISTINCT FROM (SELECT lower(email) FROM auth.users WHERE id=actor) THEN RAISE EXCEPTION 'Request unavailable'; END IF;
 UPDATE private.account_eligibility SET version=version+1,guardian_status=CASE WHEN approve THEN 'approved' ELSE 'revoked' END,guardian_id=actor,guardian_decided_at=now(),guardian_declaration='I am at least 18 and authorised as this child’s parent or legal guardian; I have read the privacy, safety and community notices.' WHERE user_id=child_id;
 INSERT INTO private.guardian_audit(child_id,actor_id,action) VALUES(child_id,actor,CASE WHEN approve THEN 'approved' ELSE 'revoked' END);
 RETURN jsonb_build_object('success',true);
END $$;
CREATE OR REPLACE FUNCTION private.commit_content(actor uuid,target text,operation text,record jsonb,row_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE d public.diaries; c public.comments; m public.chats; owner uuid; parent_post uuid; hidden boolean;
BEGIN
 IF NOT private.account_can_use(actor) THEN RAISE EXCEPTION 'Complete account eligibility and guardian consent first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND (banned_until IS NULL OR banned_until<now())) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF target='diaries' THEN
  IF operation='insert' THEN
   hidden=coalesce((record->>'is_anonymous')::boolean,false);
   INSERT INTO public.diaries(author_id,title,scripture,content,category,is_anonymous,visibility,allow_comments,allow_likes) VALUES(CASE WHEN hidden THEN NULL ELSE actor END,record->>'title',record->>'scripture',record->>'content',record->>'category',hidden,coalesce(record->>'visibility','public'),coalesce((record->>'allow_comments')::boolean,true),coalesce((record->>'allow_likes')::boolean,true)) RETURNING * INTO d;
   INSERT INTO public.diary_owners VALUES(d.id,actor);
  ELSIF operation='update' THEN
   SELECT user_id INTO owner FROM public.diary_owners WHERE post_id=row_id;
   IF owner IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Not permitted'; END IF;
   UPDATE public.diaries SET title=CASE WHEN record?'title' THEN record->>'title' ELSE title END,scripture=CASE WHEN record?'scripture' THEN record->>'scripture' ELSE scripture END,content=coalesce(record->>'content',content) WHERE id=row_id RETURNING * INTO d;
  ELSE RAISE EXCEPTION 'Invalid operation'; END IF;
  RETURN to_jsonb(d)||jsonb_build_object('owned_by_me',true);
 ELSIF target='comments' THEN
  IF operation='insert' THEN
   SELECT * INTO d FROM public.diaries WHERE id=(record->>'post_id')::uuid;
   IF d.id IS NULL OR NOT d.allow_comments OR (d.visibility='private' AND NOT EXISTS(SELECT 1 FROM public.diary_owners WHERE post_id=d.id AND user_id=actor)) THEN RAISE EXCEPTION 'Comments unavailable'; END IF;
   IF record->>'parent_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.comments WHERE id=(record->>'parent_id')::uuid AND post_id=d.id) THEN RAISE EXCEPTION 'Invalid reply'; END IF;
   hidden=coalesce((record->>'is_anonymous')::boolean,false);
   INSERT INTO public.comments(post_id,parent_id,author_id,content,is_anonymous) VALUES(d.id,(record->>'parent_id')::uuid,CASE WHEN hidden THEN NULL ELSE actor END,record->>'content',hidden) RETURNING * INTO c;
   INSERT INTO public.comment_owners VALUES(c.id,actor);
  ELSIF operation='update' THEN
   IF NOT EXISTS(SELECT 1 FROM public.comment_owners WHERE comment_id=row_id AND user_id=actor) THEN RAISE EXCEPTION 'Not permitted'; END IF;
   UPDATE public.comments SET content=record->>'content' WHERE id=row_id RETURNING * INTO c;
  ELSE RAISE EXCEPTION 'Invalid operation'; END IF;
  RETURN to_jsonb(c)||jsonb_build_object('owned_by_me',true);
 ELSIF target='chats' AND operation='insert' THEN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(record->>'receiver_id')::uuid AND allow_dms AND privacy_mode='public') THEN RAISE EXCEPTION 'Recipient is not accepting messages'; END IF;
  INSERT INTO public.chats(sender_id,receiver_id,message) VALUES(actor,(record->>'receiver_id')::uuid,record->>'message') RETURNING * INTO m;
  RETURN to_jsonb(m);
 END IF;
 RAISE EXCEPTION 'Invalid content operation';
END $$;
CREATE OR REPLACE FUNCTION private.moderated_submit(actor uuid,target text,operation text,record jsonb,row_id uuid,decision text,reason text,policy_version text,categories jsonb,base_record jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item private.moderation_submissions; fingerprint text; hidden boolean:=true; existing jsonb; result jsonb;
BEGIN
 IF NOT private.account_can_use(actor) THEN RAISE EXCEPTION 'Complete account eligibility and guardian consent first'; END IF;
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

-- Reports contain references, never uploaded evidence or a duplicate copy of private text.
CREATE TABLE private.safety_reports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reporter_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 target_kind text NOT NULL CHECK(target_kind IN('diaries','comments','chats','profiles')),target_id uuid NOT NULL,author_id uuid REFERENCES auth.users ON DELETE SET NULL,
 reason text NOT NULL CHECK(reason IN('child_safety','harassment','hate','scam','privacy','self_harm','other')),details text NOT NULL CHECK(length(details)<=1000),
 private_context boolean NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN('open','escalated','dismissed','removed','restricted')),version integer NOT NULL DEFAULT 1,
 resolution text CHECK(length(resolution)<=500),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON private.safety_reports(reporter_id,created_at DESC);
CREATE INDEX ON private.safety_reports(author_id);
CREATE INDEX ON private.safety_reports(status,created_at);
CREATE UNIQUE INDEX report_one_open ON private.safety_reports(reporter_id,target_kind,target_id) WHERE status IN('open','escalated');
CREATE TABLE private.safety_report_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,report_id uuid NOT NULL REFERENCES private.safety_reports ON DELETE CASCADE,actor_id uuid REFERENCES auth.users ON DELETE SET NULL,action text NOT NULL,note text CHECK(length(note)<=500),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON private.safety_report_audit(report_id,created_at);
CREATE INDEX ON private.safety_report_audit(actor_id);
ALTER TABLE private.safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.safety_report_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.safety_reports,private.safety_report_audit FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.submit_safety_report(target_kind text,target_id uuid,reason text,details text DEFAULT '',share_private boolean DEFAULT false,also_block boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=auth.uid();owner uuid;hidden boolean:=true;item uuid;accessible boolean:=false;
BEGIN
 IF NOT private.active_member() THEN RAISE EXCEPTION 'Account access required'; END IF;
 IF reason IS NULL OR reason NOT IN('child_safety','harassment','hate','scam','privacy','self_harm','other') OR details IS NULL OR length(details)>1000 THEN RAISE EXCEPTION 'Choose a reason and keep details under 1000 characters'; END IF;
 -- Resolve only content the caller may report; never trust an author ID from the client.
 IF target_kind='diaries' THEN SELECT o.user_id,d.visibility<>'public' INTO owner,hidden FROM public.diaries d JOIN public.diary_owners o ON o.post_id=d.id WHERE d.id=target_id AND (d.visibility='public' OR o.user_id=actor);
 ELSIF target_kind='comments' THEN SELECT o.user_id,d.visibility<>'public' INTO owner,hidden FROM public.comments c JOIN public.comment_owners o ON o.comment_id=c.id JOIN public.diaries d ON d.id=c.post_id WHERE c.id=target_id AND (d.visibility='public' OR EXISTS(SELECT 1 FROM public.diary_owners WHERE post_id=d.id AND user_id=actor));
 ELSIF target_kind='chats' THEN SELECT sender_id,true INTO owner,hidden FROM public.chats WHERE id=target_id AND (sender_id=actor OR receiver_id=actor);
 ELSIF target_kind='profiles' THEN SELECT id,false INTO owner,hidden FROM public.profiles WHERE id=target_id AND (privacy_mode='public' OR EXISTS(SELECT 1 FROM public.chats WHERE (sender_id=actor AND receiver_id=target_id) OR (sender_id=target_id AND receiver_id=actor)));
 ELSE RAISE EXCEPTION 'Unsupported report target'; END IF;
 IF owner IS NULL OR owner=actor THEN RAISE EXCEPTION 'Report target unavailable'; END IF;
 IF hidden AND share_private IS DISTINCT FROM true THEN RAISE EXCEPTION 'Consent to share this message with the restricted safety team'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||'reports',0));
 SELECT id INTO item FROM private.safety_reports r WHERE r.reporter_id=actor AND r.target_kind=submit_safety_report.target_kind AND r.target_id=submit_safety_report.target_id AND r.status IN('open','escalated');
 IF item IS NOT NULL THEN RETURN jsonb_build_object('id',item,'duplicate',true); END IF;
 IF (SELECT count(*) FROM private.safety_reports WHERE reporter_id=actor AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'Report limit reached. Contact support for urgent concerns'; END IF;
 INSERT INTO private.safety_reports(reporter_id,target_kind,target_id,author_id,reason,details,private_context) VALUES(actor,target_kind,target_id,owner,reason,trim(details),hidden) RETURNING id INTO item;
 INSERT INTO private.safety_report_audit(report_id,actor_id,action) VALUES(item,actor,'submitted');
 IF also_block THEN INSERT INTO public.blocked_accounts(user_id,blocked_user_id) VALUES(actor,owner) ON CONFLICT DO NOTHING; END IF;
 RETURN jsonb_build_object('id',item,'success',true);
END $$;
CREATE FUNCTION private.safety_report_list(queue boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE staff text;result jsonb;
BEGIN
 IF NOT private.active_member() THEN RAISE EXCEPTION 'Account access required'; END IF;
 SELECT role INTO staff FROM private.moderation_memberships WHERE user_id=auth.uid();
 IF queue AND (staff IS NULL OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal2') THEN RAISE EXCEPTION 'Moderator access and authenticator verification required'; END IF;
 IF queue THEN INSERT INTO private.safety_report_audit(report_id,actor_id,action) SELECT id,auth.uid(),'queue_view' FROM private.safety_reports WHERE status IN('open','escalated') AND reporter_id<>auth.uid() AND author_id IS DISTINCT FROM auth.uid() AND (NOT private_context OR staff='safety_reviewer') ORDER BY CASE WHEN reason='child_safety' THEN 0 ELSE 1 END,created_at DESC LIMIT 100; END IF;
 SELECT coalesce(jsonb_agg(x),'[]'::jsonb) INTO result FROM (
 SELECT r.id,r.target_kind,r.reason,r.status,r.version,r.created_at,r.updated_at,r.resolution,
 CASE WHEN queue THEN r.details END AS details,r.private_context,
 CASE WHEN queue THEN CASE r.target_kind WHEN 'diaries' THEN (SELECT content FROM public.diaries WHERE id=r.target_id) WHEN 'comments' THEN (SELECT content FROM public.comments WHERE id=r.target_id) WHEN 'chats' THEN (SELECT message FROM public.chats WHERE id=r.target_id) WHEN 'profiles' THEN (SELECT concat_ws(' ',full_name,bio) FROM public.profiles WHERE id=r.target_id) END END AS reported_text
 FROM private.safety_reports r WHERE CASE WHEN queue THEN r.reporter_id<>auth.uid() AND r.author_id IS DISTINCT FROM auth.uid() AND r.status IN('open','escalated') AND (NOT r.private_context OR staff='safety_reviewer') ELSE r.reporter_id=auth.uid() END
 ORDER BY CASE WHEN r.reason='child_safety' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 100) x;
 RETURN result;
END $$;
CREATE FUNCTION private.safety_report_action(report_id uuid,expected_version integer,action text,note text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item private.safety_reports;staff text;actor uuid:=auth.uid();
BEGIN
 IF NOT private.active_member() THEN RAISE EXCEPTION 'Account access required'; END IF;
 SELECT role INTO staff FROM private.moderation_memberships WHERE user_id=actor;
 IF staff IS NULL OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION 'Moderator access and authenticator verification required'; END IF;
 SELECT * INTO item FROM private.safety_reports WHERE id=report_id FOR UPDATE;
 IF item.id IS NULL OR item.reporter_id=actor OR item.author_id=actor OR (item.private_context AND staff<>'safety_reviewer') OR item.version IS DISTINCT FROM expected_version OR item.status NOT IN('open','escalated') THEN RAISE EXCEPTION 'Report unavailable or changed. Refresh'; END IF;
 IF action IS NULL OR action NOT IN('dismissed','removed','escalated','restricted') OR note IS NULL OR length(trim(note))<5 OR length(note)>500 THEN RAISE EXCEPTION 'Choose an action and record a clear reason'; END IF;
 IF action='restricted' THEN
  IF item.author_id IS NULL THEN RAISE EXCEPTION 'Account no longer exists. Resolve the content report instead'; END IF;
  IF staff<>'safety_reviewer' OR EXISTS(SELECT 1 FROM private.moderation_memberships WHERE user_id=item.author_id) OR EXISTS(SELECT 1 FROM private.waitlist_admins WHERE user_id=item.author_id) THEN RAISE EXCEPTION 'Restriction requires a safety reviewer and a non-staff target'; END IF;
  UPDATE auth.users SET banned_until=now()+interval '100 years' WHERE id=item.author_id;
  DELETE FROM auth.sessions WHERE user_id=item.author_id;
 ELSIF action='removed' THEN
  IF item.target_kind='diaries' THEN DELETE FROM public.diaries WHERE id=item.target_id;
  ELSIF item.target_kind='comments' THEN DELETE FROM public.comments WHERE id=item.target_id;
  ELSIF item.target_kind='chats' THEN DELETE FROM public.chats WHERE id=item.target_id;
  ELSE RAISE EXCEPTION 'Profile reports may be dismissed, escalated or restricted'; END IF;
 END IF;
 UPDATE private.safety_reports SET status=action,resolution=trim(note),version=version+1,updated_at=now() WHERE id=report_id;
 INSERT INTO private.safety_report_audit(report_id,actor_id,action,note) VALUES(report_id,actor,action,trim(note));
 RETURN jsonb_build_object('success',true);
END $$;
REVOKE ALL ON FUNCTION private.eligibility_status() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.eligibility_status() TO authenticated;
CREATE FUNCTION public.eligibility_status() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.eligibility_status() $$;
REVOKE ALL ON FUNCTION public.eligibility_status() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.eligibility_status() TO authenticated;
REVOKE ALL ON FUNCTION private.complete_account_setup(date,text,boolean,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.complete_account_setup(date,text,boolean,text) TO authenticated;
CREATE FUNCTION public.complete_account_setup(birth_date date,guardian_email text,accepted boolean,policy_version text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.complete_account_setup(birth_date,guardian_email,accepted,policy_version) $$;
REVOKE ALL ON FUNCTION public.complete_account_setup(date,text,boolean,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.complete_account_setup(date,text,boolean,text) TO authenticated;
REVOKE ALL ON FUNCTION private.guardian_requests() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.guardian_requests() TO authenticated;
CREATE FUNCTION public.guardian_requests() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.guardian_requests() $$;
REVOKE ALL ON FUNCTION public.guardian_requests() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.guardian_requests() TO authenticated;
REVOKE ALL ON FUNCTION private.guardian_decide(uuid,boolean,boolean,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.guardian_decide(uuid,boolean,boolean,integer) TO authenticated;
CREATE FUNCTION public.guardian_decide(child_id uuid,approve boolean,declaration boolean,expected_version integer) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.guardian_decide(child_id,approve,declaration,expected_version) $$;
REVOKE ALL ON FUNCTION public.guardian_decide(uuid,boolean,boolean,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.guardian_decide(uuid,boolean,boolean,integer) TO authenticated;
REVOKE ALL ON FUNCTION private.submit_safety_report(text,uuid,text,text,boolean,boolean) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.submit_safety_report(text,uuid,text,text,boolean,boolean) TO authenticated;
CREATE FUNCTION public.submit_safety_report(target_kind text,target_id uuid,reason text,details text DEFAULT '',share_private boolean DEFAULT false,also_block boolean DEFAULT false) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.submit_safety_report(target_kind,target_id,reason,details,share_private,also_block) $$;
REVOKE ALL ON FUNCTION public.submit_safety_report(text,uuid,text,text,boolean,boolean) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.submit_safety_report(text,uuid,text,text,boolean,boolean) TO authenticated;
REVOKE ALL ON FUNCTION private.safety_report_list(boolean) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.safety_report_list(boolean) TO authenticated;
CREATE FUNCTION public.safety_report_list(queue boolean DEFAULT false) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.safety_report_list(queue) $$;
REVOKE ALL ON FUNCTION public.safety_report_list(boolean) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.safety_report_list(boolean) TO authenticated;
REVOKE ALL ON FUNCTION private.safety_report_action(uuid,integer,text,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.safety_report_action(uuid,integer,text,text) TO authenticated;
CREATE FUNCTION public.safety_report_action(report_id uuid,expected_version integer,action text,note text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.safety_report_action(report_id,expected_version,action,note) $$;
REVOKE ALL ON FUNCTION public.safety_report_action(uuid,integer,text,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.safety_report_action(uuid,integer,text,text) TO authenticated;

CREATE FUNCTION public.account_access() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.active_member() $$;
REVOKE ALL ON FUNCTION public.account_access() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.account_access() TO authenticated;
CREATE OR REPLACE FUNCTION private.waitlist_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT private.active_member() AND auth.jwt()->>'aal'='aal2' AND EXISTS(SELECT 1 FROM private.waitlist_admins WHERE user_id=auth.uid()) $$;
-- Revoked permission, an unconfirmed guardian email change or account deletion
-- also removes previously published content from community reads.
CREATE FUNCTION private.diary_author_eligible(post uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM public.diary_owners WHERE post_id=post AND private.account_can_use(user_id)) $$;
CREATE FUNCTION private.comment_author_eligible(comment uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM public.comment_owners WHERE comment_id=comment AND private.account_can_use(user_id)) $$;
REVOKE ALL ON FUNCTION private.diary_author_eligible(uuid),private.comment_author_eligible(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.diary_author_eligible(uuid),private.comment_author_eligible(uuid) TO authenticated;
CREATE POLICY diary_eligible ON public.diaries AS RESTRICTIVE FOR SELECT TO authenticated USING(private.diary_author_eligible(id));
CREATE POLICY comment_eligible ON public.comments AS RESTRICTIVE FOR SELECT TO authenticated USING(private.comment_author_eligible(id));
CREATE OR REPLACE FUNCTION private.moderation_stats() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION 'Authenticator verification required'; END IF;
 IF NOT private.active_member() OR NOT EXISTS(SELECT 1 FROM private.moderation_memberships WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Moderator access required';END IF;
 -- No per-user, private-content or small-group breakdowns.
 RETURN (SELECT coalesce(jsonb_object_agg(status,n),'{}') FROM (SELECT status,count(*) n FROM private.moderation_submissions WHERE NOT private_content AND expires_at>now() GROUP BY status) x);
END $$;
CREATE OR REPLACE FUNCTION private.moderation_list(queue boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=auth.uid(); staff text; result jsonb;
BEGIN
 IF queue AND auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION 'Authenticator verification required'; END IF;
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
  IF auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION 'Authenticator verification required'; END IF;
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

CREATE FUNCTION private.profile_eligible(member uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT member=auth.uid() OR private.account_can_use(member) $$;
REVOKE ALL ON FUNCTION private.profile_eligible(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.profile_eligible(uuid) TO authenticated;
CREATE POLICY profile_eligible ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING(private.profile_eligible(id));
-- A deleted guardian cannot leave an apparently valid permission or email
-- reference behind on a child's account. Correction requires support review.
CREATE FUNCTION private.clear_deleted_guardian() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO private.guardian_audit(child_id,action) SELECT user_id,'guardian_account_deleted' FROM private.account_eligibility WHERE user_id<>OLD.id AND (guardian_id=OLD.id OR guardian_email=lower(OLD.email));
 UPDATE private.account_eligibility SET version=version+1,guardian_id=NULL,guardian_email=NULL,guardian_status='revoked',guardian_decided_at=now() WHERE user_id<>OLD.id AND (guardian_id=OLD.id OR guardian_email=lower(OLD.email));
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION private.clear_deleted_guardian() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER clear_deleted_guardian BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION private.clear_deleted_guardian();
