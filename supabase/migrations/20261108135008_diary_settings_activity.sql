-- Bible Diaries settings, owner-only achievements and server-generated activity.
-- Apply after 20261101122925_enforce_app_security.sql. Never apply legacy schema.sql over a hardened database.
CREATE TABLE public.diary_settings (
 user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
 font_size integer NOT NULL DEFAULT 16 CHECK(font_size BETWEEN 12 AND 24),
 font_family text NOT NULL DEFAULT 'sans' CHECK(font_family IN('sans','serif','mono')),
 line_spacing numeric NOT NULL DEFAULT 1.6 CHECK(line_spacing IN(1.4,1.6,1.8,2)),
 default_private boolean NOT NULL DEFAULT false, default_anonymous boolean NOT NULL DEFAULT false,
 default_comments boolean NOT NULL DEFAULT true, default_likes boolean NOT NULL DEFAULT true,
 notify_likes boolean NOT NULL DEFAULT true, notify_comments boolean NOT NULL DEFAULT true,
 notify_bookmarks boolean NOT NULL DEFAULT true, notify_shares boolean NOT NULL DEFAULT true, notify_posts boolean NOT NULL DEFAULT true,
 quiet_enabled boolean NOT NULL DEFAULT false,
 quiet_start text NOT NULL DEFAULT '22:00' CHECK(quiet_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 quiet_end text NOT NULL DEFAULT '07:00' CHECK(quiet_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
CREATE TABLE public.blocked_accounts (
 user_id uuid REFERENCES auth.users ON DELETE CASCADE, blocked_user_id uuid REFERENCES auth.users ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,blocked_user_id), CHECK(user_id<>blocked_user_id)
);
CREATE TABLE public.reflection_subscriptions (
 user_id uuid REFERENCES auth.users ON DELETE CASCADE, author_id uuid REFERENCES auth.users ON DELETE CASCADE,
 PRIMARY KEY(user_id,author_id), CHECK(user_id<>author_id)
);
CREATE TABLE public.reflection_shares (
 user_id uuid REFERENCES auth.users ON DELETE CASCADE, post_id uuid REFERENCES public.diaries ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,post_id)
);
CREATE TABLE public.diary_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 actor_id uuid REFERENCES auth.users ON DELETE SET NULL, post_id uuid NOT NULL REFERENCES public.diaries ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN('like','comment','bookmark','share','post','reply','comment_like')),
 source_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz,
 UNIQUE(recipient_id,kind,source_key)
);
CREATE TABLE private.diary_activity_actors (
 activity_id uuid PRIMARY KEY REFERENCES public.diary_activity ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE
);
ALTER TABLE private.diary_activity_actors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.diary_activity_actors FROM PUBLIC,anon,authenticated;
CREATE TABLE public.diary_achievements (
 user_id uuid REFERENCES auth.users ON DELETE CASCADE, achievement_id text NOT NULL,
 earned_at timestamptz NOT NULL DEFAULT now(), seen_at timestamptz, PRIMARY KEY(user_id,achievement_id)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['diary_settings','blocked_accounts','reflection_subscriptions','reflection_shares','diary_activity','diary_achievements'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON public.diary_settings TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.blocked_accounts,public.reflection_subscriptions TO authenticated;
GRANT SELECT,INSERT ON public.reflection_shares TO authenticated;
GRANT DELETE ON public.diary_activity TO authenticated;
GRANT SELECT(id,recipient_id,actor_id,post_id,kind,created_at,read_at) ON public.diary_activity TO authenticated;
GRANT UPDATE(read_at) ON public.diary_activity TO authenticated;
GRANT SELECT ON public.diary_achievements TO authenticated;
GRANT UPDATE(seen_at) ON public.diary_achievements TO authenticated;
CREATE POLICY settings_owner ON public.diary_settings FOR ALL TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT private.active_member())) WITH CHECK(user_id=(SELECT auth.uid()) AND (SELECT private.active_member()));
CREATE POLICY block_owner ON public.blocked_accounts FOR ALL TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT private.active_member())) WITH CHECK(user_id=(SELECT auth.uid()) AND (SELECT private.active_member()));
-- Definer is required to check either direction without exposing another user's block list.
CREATE FUNCTION private.no_block(a uuid,b uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT NOT EXISTS(SELECT 1 FROM public.blocked_accounts WHERE (user_id=a AND blocked_user_id=b) OR (user_id=b AND blocked_user_id=a))
$$;
REVOKE ALL ON FUNCTION private.no_block(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.no_block(uuid,uuid) TO authenticated,service_role;
CREATE FUNCTION private.post_unblocked(post uuid,reader uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce((SELECT private.no_block(reader,user_id) FROM public.diary_owners WHERE post_id=post),true)
$$;
REVOKE ALL ON FUNCTION private.post_unblocked(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.post_unblocked(uuid,uuid) TO authenticated,service_role;
CREATE FUNCTION private.activity_unblocked(event uuid,reader uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce((SELECT private.no_block(reader,actor_id) FROM private.diary_activity_actors WHERE activity_id=event),true)
$$;
REVOKE ALL ON FUNCTION private.activity_unblocked(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.activity_unblocked(uuid,uuid) TO authenticated,service_role;
CREATE POLICY profile_blocks ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING(private.no_block((SELECT auth.uid()),id));
CREATE POLICY diary_blocks ON public.diaries AS RESTRICTIVE FOR SELECT TO authenticated USING(private.post_unblocked(id,(SELECT auth.uid())));
CREATE FUNCTION private.comment_unblocked(comment uuid,reader uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce((SELECT private.no_block(reader,user_id) FROM public.comment_owners WHERE comment_id=comment),true)
$$;
REVOKE ALL ON FUNCTION private.comment_unblocked(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.comment_unblocked(uuid,uuid) TO authenticated,service_role;
CREATE POLICY comment_blocks ON public.comments AS RESTRICTIVE FOR SELECT TO authenticated USING(private.comment_unblocked(id,(SELECT auth.uid())));
CREATE POLICY chat_blocks ON public.chats AS RESTRICTIVE FOR SELECT TO authenticated USING(private.no_block(sender_id,receiver_id));
CREATE POLICY subscribe_owner ON public.reflection_subscriptions FOR ALL TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT private.active_member())) WITH CHECK(user_id=(SELECT auth.uid()) AND (SELECT private.active_member()) AND private.no_block(user_id,author_id) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=author_id));
CREATE POLICY shares_owner ON public.reflection_shares FOR ALL TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT private.active_member())) WITH CHECK(user_id=(SELECT auth.uid()) AND (SELECT private.active_member()) AND EXISTS(SELECT 1 FROM public.diaries WHERE id=post_id AND visibility='public'));
CREATE POLICY activity_owner ON public.diary_activity FOR ALL TO authenticated USING(recipient_id=(SELECT auth.uid()) AND (SELECT private.active_member()) AND private.activity_unblocked(id,recipient_id) AND EXISTS(SELECT 1 FROM public.diaries WHERE id=post_id)) WITH CHECK(recipient_id=(SELECT auth.uid()) AND (SELECT private.active_member()));
CREATE POLICY achievement_owner ON public.diary_achievements FOR ALL TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT private.active_member())) WITH CHECK(user_id=(SELECT auth.uid()) AND (SELECT private.active_member()));
CREATE INDEX ON public.diary_activity(recipient_id,created_at DESC);
CREATE INDEX ON public.diary_activity(recipient_id) WHERE read_at IS NULL;
CREATE INDEX ON public.blocked_accounts(blocked_user_id,user_id);
CREATE INDEX ON public.reflection_subscriptions(author_id);
CREATE INDEX ON public.reflection_shares(post_id);
CREATE INDEX ON public.diary_activity(post_id);
CREATE INDEX ON public.diary_activity(actor_id);
CREATE INDEX ON private.diary_activity_actors(actor_id);

-- Achievements are derived from actual persisted actions, never client counters.
CREATE FUNCTION private.refresh_diary_achievements(actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE reflections bigint; bookmarks bigint; comments bigint; shares bigint;
BEGIN
 SELECT count(*) INTO reflections FROM public.diary_owners WHERE user_id=actor;
 SELECT count(*) INTO bookmarks FROM public.favorites WHERE user_id=actor;
 SELECT count(*) INTO comments FROM public.comment_owners WHERE user_id=actor;
 SELECT count(*) INTO shares FROM public.reflection_shares WHERE user_id=actor;
 INSERT INTO public.diary_achievements(user_id,achievement_id)
 SELECT actor,v.id FROM (VALUES('reflection-1',reflections,1),('reflection-10',reflections,10),('reflection-50',reflections,50),('bookmark-1',bookmarks,1),('bookmark-10',bookmarks,10),('comment-1',comments,1),('comment-25',comments,25),('share-1',shares,1),('share-10',shares,10)) AS v(id,progress,target)
 WHERE v.progress>=v.target ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION private.refresh_diary_achievements(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.emit_diary_activity(recipient uuid,actor uuid,post uuid,event text,source text,hide_actor boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE pref public.diary_settings; activity uuid;
BEGIN
 IF recipient IS NULL OR actor IS NULL OR recipient=actor OR NOT private.no_block(recipient,actor) THEN RETURN; END IF;
 SELECT * INTO pref FROM public.diary_settings WHERE user_id=recipient;
 IF (event IN('like','comment_like') AND pref.notify_likes IS FALSE) OR (event IN('comment','reply') AND pref.notify_comments IS FALSE) OR (event='bookmark' AND pref.notify_bookmarks IS FALSE) OR (event='share' AND pref.notify_shares IS FALSE) OR (event='post' AND pref.notify_posts IS FALSE) THEN RETURN; END IF;
 INSERT INTO public.diary_activity(recipient_id,actor_id,post_id,kind,source_key) VALUES(recipient,CASE WHEN hide_actor THEN NULL ELSE actor END,post,event,source) ON CONFLICT DO NOTHING RETURNING id INTO activity;
 IF activity IS NOT NULL THEN INSERT INTO private.diary_activity_actors VALUES(activity,actor); END IF;
END $$;
REVOKE ALL ON FUNCTION private.emit_diary_activity(uuid,uuid,uuid,text,text,boolean) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.diary_interaction_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owner_id uuid; post uuid; actor uuid; kind text; hidden boolean:=false; subscriber uuid; source text; parent_owner uuid;
BEGIN
 actor=NEW.user_id;
 IF TG_TABLE_NAME='diary_owners' THEN
  post=NEW.post_id;
  IF EXISTS(SELECT 1 FROM public.diaries d JOIN public.profiles p ON p.id=actor WHERE d.id=post AND d.visibility='public' AND NOT d.is_anonymous AND p.privacy_mode='public') THEN
   FOR subscriber IN SELECT user_id FROM public.reflection_subscriptions WHERE author_id=actor LOOP
    PERFORM private.emit_diary_activity(subscriber,actor,post,'post',post::text);
   END LOOP;
  END IF;
 ELSIF TG_TABLE_NAME='comment_owners' THEN
  SELECT post_id,is_anonymous INTO post,hidden FROM public.comments WHERE id=NEW.comment_id;
  kind='comment'; source=NEW.comment_id::text;
 ELSIF TG_TABLE_NAME='comment_likes' THEN
  SELECT post_id INTO post FROM public.comments WHERE id=NEW.comment_id;
  SELECT user_id INTO parent_owner FROM public.comment_owners WHERE comment_id=NEW.comment_id;
  PERFORM private.emit_diary_activity(parent_owner,actor,post,'comment_like',NEW.comment_id::text||':'||actor::text);
 ELSIF TG_TABLE_NAME='likes' THEN post=NEW.post_id; kind='like';
 ELSIF TG_TABLE_NAME='favorites' THEN post=NEW.post_id; kind='bookmark'; hidden=true;
 ELSE post=NEW.post_id; kind='share'; END IF;
 IF kind IS NOT NULL THEN
  SELECT user_id INTO owner_id FROM public.diary_owners WHERE post_id=post;
  PERFORM private.emit_diary_activity(owner_id,actor,post,kind,coalesce(source,post::text||':'||actor::text),hidden);
  IF kind='comment' THEN
   SELECT o.user_id INTO parent_owner FROM public.comments c JOIN public.comment_owners o ON o.comment_id=c.parent_id WHERE c.id=NEW.comment_id;
   IF parent_owner IS DISTINCT FROM owner_id THEN PERFORM private.emit_diary_activity(parent_owner,actor,post,'reply',source,hidden); END IF;
  END IF;
 END IF;
 IF TG_TABLE_NAME NOT IN('likes','comment_likes') THEN PERFORM private.refresh_diary_achievements(actor); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.diary_interaction_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER diary_achievement AFTER INSERT ON public.diary_owners FOR EACH ROW EXECUTE FUNCTION private.diary_interaction_event();
CREATE TRIGGER comment_activity AFTER INSERT ON public.comment_owners FOR EACH ROW EXECUTE FUNCTION private.diary_interaction_event();
CREATE TRIGGER comment_like_activity AFTER INSERT ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION private.diary_interaction_event();
CREATE TRIGGER like_activity AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION private.diary_interaction_event();
CREATE TRIGGER bookmark_activity AFTER INSERT ON public.favorites FOR EACH ROW EXECUTE FUNCTION private.diary_interaction_event();
CREATE TRIGGER share_activity AFTER INSERT ON public.reflection_shares FOR EACH ROW EXECUTE FUNCTION private.diary_interaction_event();
-- Enforce blocks for trusted server-side writes as well as public Data API reads.
CREATE FUNCTION private.reject_blocked_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid; peer uuid;
BEGIN
 IF TG_TABLE_NAME='chats' THEN actor=NEW.sender_id;peer=NEW.receiver_id;
 ELSIF TG_TABLE_NAME='comment_owners' THEN actor=NEW.user_id;SELECT o.user_id INTO peer FROM public.comments c JOIN public.diary_owners o ON o.post_id=c.post_id WHERE c.id=NEW.comment_id;
 ELSE actor=NEW.user_id;SELECT user_id INTO peer FROM public.diary_owners WHERE post_id=NEW.post_id;
 END IF;
 IF NOT private.no_block(actor,peer) THEN RAISE EXCEPTION 'Interaction unavailable'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.reject_blocked_content() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER block_messages BEFORE INSERT ON public.chats FOR EACH ROW EXECUTE FUNCTION private.reject_blocked_content();
CREATE TRIGGER block_comments BEFORE INSERT ON public.comment_owners FOR EACH ROW EXECUTE FUNCTION private.reject_blocked_content();
CREATE TRIGGER block_likes BEFORE INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION private.reject_blocked_content();
CREATE TRIGGER block_shares BEFORE INSERT ON public.reflection_shares FOR EACH ROW EXECUTE FUNCTION private.reject_blocked_content();

CREATE FUNCTION private.my_diary_progress() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=auth.uid(); result jsonb;
BEGIN
 IF NOT private.active_member() THEN RAISE EXCEPTION 'Sign in again'; END IF;
 SELECT jsonb_build_object('reflections',(SELECT count(*) FROM public.diary_owners WHERE user_id=actor),'bookmarks',(SELECT count(*) FROM public.favorites WHERE user_id=actor),'comments',(SELECT count(*) FROM public.comment_owners WHERE user_id=actor),'shares',(SELECT count(*) FROM public.reflection_shares WHERE user_id=actor)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.my_diary_progress() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.my_diary_progress() TO authenticated;
CREATE FUNCTION public.my_diary_progress() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.my_diary_progress() $$;
REVOKE ALL ON FUNCTION public.my_diary_progress() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_diary_progress() TO authenticated;
CREATE FUNCTION private.my_diary_sessions() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT private.active_member() THEN RAISE EXCEPTION 'Sign in again'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'created_at',s.created_at,'updated_at',s.updated_at,'user_agent',s.user_agent,'current',s.id::text=auth.jwt()->>'session_id') ORDER BY s.created_at DESC) FROM auth.sessions s WHERE s.user_id=auth.uid()),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION private.my_diary_sessions() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.my_diary_sessions() TO authenticated;
CREATE FUNCTION public.my_diary_sessions() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.my_diary_sessions() $$;
REVOKE ALL ON FUNCTION public.my_diary_sessions() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_diary_sessions() TO authenticated;
DO $$ DECLARE actor uuid; BEGIN
 FOR actor IN SELECT DISTINCT user_id FROM public.diary_owners UNION SELECT DISTINCT user_id FROM public.favorites UNION SELECT DISTINCT user_id FROM public.comment_owners LOOP
 PERFORM private.refresh_diary_achievements(actor);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
