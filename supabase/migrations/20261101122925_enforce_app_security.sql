-- Registration form, password policy and email confirmation settings are unchanged.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
CREATE TABLE public.profile_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  address text CHECK (length(address)<=500), phone_number text CHECK(length(phone_number)<=32)
);
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_contacts FROM PUBLIC,anon,authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profile_contacts TO authenticated;
CREATE POLICY contacts_owner ON public.profile_contacts FOR ALL TO authenticated
 USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
INSERT INTO public.profile_contacts SELECT id,address,phone_number FROM public.profiles;
UPDATE public.profiles SET address=NULL,phone_number=NULL;
ALTER TABLE public.profiles ADD CONSTRAINT contact_columns_private CHECK(address IS NULL AND phone_number IS NULL);
ALTER TABLE public.profiles ADD CONSTRAINT profile_privacy_valid CHECK(privacy_mode IN ('public','private'));

CREATE FUNCTION private.image_dimensions_ok(raw bytea,kind text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE w bigint;h bigint;i int:=2; marker int;segment int;
BEGIN
 IF kind='png' THEN
  IF substring(raw,13,4)<>decode('49484452','hex') THEN RETURN false; END IF;
  w=get_byte(raw,16)::bigint*16777216+get_byte(raw,17)*65536+get_byte(raw,18)*256+get_byte(raw,19);
  h=get_byte(raw,20)::bigint*16777216+get_byte(raw,21)*65536+get_byte(raw,22)*256+get_byte(raw,23);
 ELSIF kind='webp' THEN
  IF substring(raw,13,4)=decode('56503858','hex') THEN
   w=1+get_byte(raw,24)+get_byte(raw,25)*256+get_byte(raw,26)*65536;h=1+get_byte(raw,27)+get_byte(raw,28)*256+get_byte(raw,29)*65536;
  ELSIF substring(raw,13,4)=decode('5650384c','hex') AND get_byte(raw,20)=47 THEN
   w=1+get_byte(raw,21)+(get_byte(raw,22)&63)*256;h=1+(get_byte(raw,22)>>6)+get_byte(raw,23)*4+(get_byte(raw,24)&15)*1024;
  ELSIF substring(raw,13,4)=decode('56503820','hex') AND substring(raw,24,3)=decode('9d012a','hex') THEN
   w=(get_byte(raw,26)+get_byte(raw,27)*256)&16383;h=(get_byte(raw,28)+get_byte(raw,29)*256)&16383;
  ELSE RETURN false; END IF;
 ELSIF kind='jpeg' THEN
  WHILE i+9<octet_length(raw) LOOP
   IF get_byte(raw,i)<>255 THEN RETURN false; END IF;
   marker=get_byte(raw,i+1);IF marker=255 THEN i=i+1;CONTINUE; END IF;
   IF marker IN(192,193,194,195,197,198,199,201,202,203,205,206,207) THEN
    h=get_byte(raw,i+5)*256+get_byte(raw,i+6);w=get_byte(raw,i+7)*256+get_byte(raw,i+8);EXIT;
   END IF;
   segment=get_byte(raw,i+2)*256+get_byte(raw,i+3);IF segment<2 THEN RETURN false;END IF;i=i+2+segment;
  END LOOP;
 ELSE RETURN false; END IF;
 RETURN coalesce(w BETWEEN 1 AND 2048 AND h BETWEEN 1 AND 2048,false);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
CREATE FUNCTION private.valid_avatar(value text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE raw bytea; kind text;
BEGIN
 IF value IS NULL OR value='' THEN RETURN true; END IF;
 IF length(value)>2800000 THEN RETURN false; END IF;
 IF value !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' THEN RETURN false; END IF;
 kind=split_part(split_part(value,';',1),'/',2);
 raw=decode(split_part(value,',',2),'base64');
 IF octet_length(raw)>2097152 THEN RETURN false; END IF;
 RETURN private.image_dimensions_ok(raw,kind) AND ((kind='png' AND substring(raw,1,8)=decode('89504e470d0a1a0a','hex'))
 OR (kind='jpeg' AND substring(raw,1,3)=decode('ffd8ff','hex'))
 OR (kind='webp' AND substring(raw,1,4)=decode('52494646','hex') AND substring(raw,9,4)=decode('57454250','hex')));
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
GRANT EXECUTE ON FUNCTION private.valid_avatar(text) TO authenticated,service_role;
ALTER TABLE public.profiles ADD CONSTRAINT avatar_valid CHECK(private.valid_avatar(avatar_url)) NOT VALID;
ALTER TABLE public.profiles ADD CONSTRAINT profile_text_limits CHECK(length(full_name)<=160 AND length(bio)<=2000 AND length(favorite_verse)<=2000 AND length(spiritual_journey)<=10000) NOT VALID;
-- Keep bulky avatars/contact data out of Auth JWT metadata while preserving
-- the existing signup form and its submitted data. All staging is transactional.
CREATE TABLE private.pending_profile_data(user_id uuid PRIMARY KEY,data jsonb NOT NULL);
ALTER TABLE private.pending_profile_data ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.pending_profile_data FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.capture_profile_data() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO private.pending_profile_data VALUES(new.id,jsonb_build_object('avatar_url',new.raw_user_meta_data->>'avatar_url','address',new.raw_user_meta_data->>'address','phone_number',new.raw_user_meta_data->>'phone_number'));
 new.raw_user_meta_data=new.raw_user_meta_data-'avatar_url'-'address'-'phone_number';
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION private.capture_profile_data() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER capture_profile_data BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.capture_profile_data();
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE personal jsonb;
BEGIN
 SELECT data INTO personal FROM private.pending_profile_data WHERE user_id=new.id;
 INSERT INTO public.profiles(id,full_name,first_name,surname,avatar_url,bio,favorite_verse,spiritual_journey,gender)
 VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name','New Member'),new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'surname',personal->>'avatar_url',new.raw_user_meta_data->>'bio',new.raw_user_meta_data->>'favorite_verse',new.raw_user_meta_data->>'spiritual_journey',new.raw_user_meta_data->>'gender');
 INSERT INTO public.profile_contacts VALUES(new.id,personal->>'address',personal->>'phone_number');
 DELETE FROM private.pending_profile_data WHERE user_id=new.id;
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;

-- A still-unexpired JWT must not revive a deleted account or revoked session.
CREATE FUNCTION private.active_member() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
 WHERE u.id=auth.uid() AND s.id::text=auth.jwt()->>'session_id' AND (u.banned_until IS NULL OR u.banned_until<now()));
$$;
REVOKE ALL ON FUNCTION private.active_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.active_member() TO authenticated;
CREATE POLICY contacts_active ON public.profile_contacts AS RESTRICTIVE FOR ALL TO authenticated USING((SELECT private.active_member())) WITH CHECK((SELECT private.active_member()));
DROP POLICY "Allow public read access to profiles" ON public.profiles;
CREATE POLICY profile_visible ON public.profiles FOR SELECT TO authenticated USING((SELECT private.active_member()) AND (id=(SELECT auth.uid()) OR privacy_mode='public'));
CREATE POLICY profile_active ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated USING((SELECT private.active_member())) WITH CHECK((SELECT private.active_member()));

ALTER TABLE public.diaries ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.comments ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.diaries ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;
ALTER TABLE public.diaries ADD COLUMN visibility text NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private'));
ALTER TABLE public.diaries ADD COLUMN allow_comments boolean NOT NULL DEFAULT true;
ALTER TABLE public.diaries ADD COLUMN allow_likes boolean NOT NULL DEFAULT true;
CREATE TABLE public.diary_owners(post_id uuid PRIMARY KEY REFERENCES public.diaries(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE public.comment_owners(comment_id uuid PRIMARY KEY REFERENCES public.comments(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE);
INSERT INTO public.diary_owners SELECT id,author_id FROM public.diaries;
INSERT INTO public.comment_owners SELECT id,author_id FROM public.comments;
ALTER TABLE public.diary_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_owners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.diary_owners,public.comment_owners FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.diary_owners,public.comment_owners TO authenticated;
CREATE POLICY diary_owner_read ON public.diary_owners FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT private.active_member()));
CREATE POLICY comment_owner_read ON public.comment_owners FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT private.active_member()));
-- Computed fields expose only a boolean to the current reader, never the hidden ID.
CREATE FUNCTION public.owned_by_me(public.diaries) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM public.diary_owners WHERE post_id=$1.id AND user_id=(SELECT auth.uid())) $$;
CREATE FUNCTION public.owned_by_me(public.comments) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM public.comment_owners WHERE comment_id=$1.id AND user_id=(SELECT auth.uid())) $$;
REVOKE ALL ON FUNCTION public.owned_by_me(public.diaries),public.owned_by_me(public.comments) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owned_by_me(public.diaries),public.owned_by_me(public.comments) TO authenticated;
UPDATE public.comments SET author_id=NULL WHERE is_anonymous;
ALTER TABLE public.diaries ADD CONSTRAINT diary_author_hidden CHECK(NOT is_anonymous OR author_id IS NULL);
ALTER TABLE public.comments ADD CONSTRAINT comment_author_hidden CHECK(NOT is_anonymous OR author_id IS NULL);

-- Replace legacy permissive policies; content writes are server-only.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('diaries','comments','likes','comment_likes','favorites','chats') LOOP
 EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename); END LOOP;
END $$;
REVOKE ALL ON public.diaries,public.comments,public.chats FROM anon,authenticated;
GRANT SELECT,DELETE ON public.diaries,public.comments TO authenticated;
GRANT SELECT ON public.chats TO authenticated;
GRANT ALL ON public.profile_contacts,public.diary_owners,public.comment_owners TO service_role;
CREATE POLICY diary_visible ON public.diaries FOR SELECT TO authenticated USING((SELECT private.active_member()) AND (visibility='public' OR EXISTS(SELECT 1 FROM public.diary_owners WHERE post_id=id)));
CREATE POLICY diary_delete ON public.diaries FOR DELETE TO authenticated USING((SELECT private.active_member()) AND EXISTS(SELECT 1 FROM public.diary_owners WHERE post_id=id));
CREATE POLICY comment_visible ON public.comments FOR SELECT TO authenticated USING((SELECT private.active_member()) AND EXISTS(SELECT 1 FROM public.diaries WHERE id=post_id));
CREATE POLICY comment_delete ON public.comments FOR DELETE TO authenticated USING((SELECT private.active_member()) AND (EXISTS(SELECT 1 FROM public.comment_owners WHERE comment_id=id) OR EXISTS(SELECT 1 FROM public.diary_owners WHERE post_id=comments.post_id)));
CREATE POLICY chat_participant ON public.chats FOR SELECT TO authenticated USING((SELECT private.active_member()) AND (sender_id=(SELECT auth.uid()) OR receiver_id=(SELECT auth.uid())));
CREATE POLICY likes_read ON public.likes FOR SELECT TO authenticated USING((SELECT private.active_member()) AND EXISTS(SELECT 1 FROM public.diaries WHERE id=post_id));
CREATE POLICY likes_insert ON public.likes FOR INSERT TO authenticated WITH CHECK((SELECT private.active_member()) AND user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.diaries WHERE id=post_id AND allow_likes));
CREATE POLICY likes_delete ON public.likes FOR DELETE TO authenticated USING((SELECT private.active_member()) AND user_id=(SELECT auth.uid()));
CREATE POLICY favorites_own ON public.favorites FOR ALL TO authenticated USING((SELECT private.active_member()) AND user_id=(SELECT auth.uid())) WITH CHECK((SELECT private.active_member()) AND user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.diaries WHERE id=post_id));
CREATE POLICY comment_likes_read ON public.comment_likes FOR SELECT TO authenticated USING((SELECT private.active_member()) AND EXISTS(SELECT 1 FROM public.comments WHERE id=comment_id));
CREATE POLICY comment_likes_insert ON public.comment_likes FOR INSERT TO authenticated WITH CHECK((SELECT private.active_member()) AND user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.comments c JOIN public.diaries d ON d.id=c.post_id WHERE c.id=comment_id AND d.allow_likes));
CREATE POLICY comment_likes_delete ON public.comment_likes FOR DELETE TO authenticated USING((SELECT private.active_member()) AND user_id=(SELECT auth.uid()));
ALTER TABLE public.diaries ADD CONSTRAINT diary_text_limits CHECK(length(content) BETWEEN 1 AND 20000 AND length(title)<=200 AND length(scripture)<=4000) NOT VALID;
ALTER TABLE public.comments ADD CONSTRAINT comment_text_limits CHECK(length(content) BETWEEN 1 AND 4000) NOT VALID;
ALTER TABLE public.chats ADD CONSTRAINT chat_text_limits CHECK(length(message) BETWEEN 1 AND 4000) NOT VALID;

CREATE TABLE private.request_limits(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,action text NOT NULL,window_start timestamptz NOT NULL,n int NOT NULL,PRIMARY KEY(user_id,action));
ALTER TABLE private.request_limits ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION private.consume_security_limit(actor uuid,action text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE hits int; ceiling int;
BEGIN
 IF action NOT IN ('content','delete') OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor) THEN RETURN false; END IF;
 ceiling=CASE WHEN action='delete' THEN 3 ELSE 30 END;
 INSERT INTO private.request_limits VALUES(actor,action,now(),1) ON CONFLICT ON CONSTRAINT request_limits_pkey DO UPDATE SET n=CASE WHEN private.request_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE private.request_limits.n+1 END,window_start=CASE WHEN private.request_limits.window_start<now()-interval '15 minutes' THEN now() ELSE private.request_limits.window_start END RETURNING n INTO hits;
 RETURN hits<=ceiling;
END $$;
REVOKE ALL ON private.request_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.request_limits TO service_role;

-- Only the verified, moderated Edge Function may call this transaction.
CREATE FUNCTION private.commit_content(actor uuid,target text,operation text,record jsonb,row_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE d public.diaries; c public.comments; m public.chats; owner uuid; parent_post uuid; hidden boolean;
BEGIN
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
CREATE FUNCTION private.purge_account_content(actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 DELETE FROM public.comments WHERE id IN(SELECT comment_id FROM public.comment_owners WHERE user_id=actor);
 DELETE FROM public.diaries WHERE id IN(SELECT post_id FROM public.diary_owners WHERE user_id=actor);
END $$;
CREATE FUNCTION private.account_avatar_objects(actor uuid) RETURNS SETOF text LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT name FROM storage.objects WHERE bucket_id='avatars' AND owner=actor LIMIT 100 $$;
REVOKE ALL ON FUNCTION private.consume_security_limit(uuid,text),private.commit_content(uuid,text,text,jsonb,uuid),private.purge_account_content(uuid),private.account_avatar_objects(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.consume_security_limit(uuid,text),private.commit_content(uuid,text,text,jsonb,uuid),private.purge_account_content(uuid),private.account_avatar_objects(uuid) TO service_role;
CREATE FUNCTION public.consume_security_limit(actor uuid,action text) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.consume_security_limit(actor,action) $$;
CREATE FUNCTION public.commit_content(actor uuid,target text,operation text,record jsonb,row_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.commit_content(actor,target,operation,record,row_id) $$;
CREATE FUNCTION public.purge_account_content(actor uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.purge_account_content(actor) $$;
CREATE FUNCTION public.account_avatar_objects(actor uuid) RETURNS SETOF text LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.account_avatar_objects(actor) $$;
REVOKE ALL ON FUNCTION public.consume_security_limit(uuid,text),public.commit_content(uuid,text,text,jsonb,uuid),public.purge_account_content(uuid),public.account_avatar_objects(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_security_limit(uuid,text),public.commit_content(uuid,text,text,jsonb,uuid),public.purge_account_content(uuid),public.account_avatar_objects(uuid) TO service_role;
-- Indexes support authorization lookups and common feeds/conversations.
CREATE INDEX ON public.diary_owners(user_id);
CREATE INDEX ON public.comment_owners(user_id);
CREATE INDEX ON public.diaries(author_id);
CREATE INDEX ON public.comments(post_id);
CREATE INDEX ON public.comments(author_id);
CREATE INDEX ON public.comments(parent_id);
CREATE INDEX ON public.chats(sender_id,created_at);
CREATE INDEX ON public.chats(receiver_id,created_at);
CREATE INDEX ON public.likes(user_id);
CREATE INDEX ON public.favorites(user_id);
CREATE INDEX ON public.comment_likes(user_id);
NOTIFY pgrst,'reload schema';
CREATE FUNCTION public.session_is_active() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT private.active_member() $$;
REVOKE ALL ON FUNCTION public.session_is_active() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.session_is_active() TO authenticated;

-- Profile pictures are served through profile RLS as validated inline images.
-- Storage assets are private and require their owner's authenticated request.
UPDATE storage.buckets SET public=false WHERE id='avatars';
DROP POLICY IF EXISTS "Allow public read access to avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete their own avatars" ON storage.objects;
CREATE POLICY avatars_owner ON storage.objects FOR ALL TO authenticated USING(bucket_id='avatars' AND owner=(SELECT auth.uid()) AND (SELECT private.active_member())) WITH CHECK(bucket_id='avatars' AND owner=(SELECT auth.uid()) AND (SELECT private.active_member()));
