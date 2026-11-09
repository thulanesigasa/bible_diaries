-- Restore signup profile details without rewriting existing member information.
ALTER TABLE public.profiles ADD COLUMN username text;
ALTER TABLE public.profiles ADD CONSTRAINT profile_username_format CHECK(username IS NULL OR username ~ '^[a-z0-9_]{3,24}$');
CREATE UNIQUE INDEX profiles_username_unique ON public.profiles(username) WHERE username IS NOT NULL;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE personal jsonb; handle text;
BEGIN
 SELECT data INTO personal FROM private.pending_profile_data WHERE user_id=new.id;
 handle=nullif(lower(btrim(new.raw_user_meta_data->>'username')),'');
 IF handle IS NOT NULL AND handle !~ '^[a-z0-9_]{3,24}$' THEN RAISE EXCEPTION 'Choose a username with 3 to 24 letters, numbers or underscores.'; END IF;
 IF new.raw_user_meta_data->>'gender' IS NOT NULL AND new.raw_user_meta_data->>'gender' NOT IN ('Male','Female') THEN RAISE EXCEPTION 'Select Male or Female.'; END IF;
 INSERT INTO public.profiles(id,full_name,first_name,surname,username,avatar_url,bio,favorite_verse,spiritual_journey,gender)
 VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name','New Member'),new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'surname',handle,personal->>'avatar_url',new.raw_user_meta_data->>'bio',new.raw_user_meta_data->>'favorite_verse',new.raw_user_meta_data->>'spiritual_journey',new.raw_user_meta_data->>'gender');
 INSERT INTO public.profile_contacts VALUES(new.id,personal->>'address',personal->>'phone_number');
 DELETE FROM private.pending_profile_data WHERE user_id=new.id;
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
