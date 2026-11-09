-- Capture declarations once at account creation, then remove the sensitive
-- transport fields from editable Auth metadata/JWTs. Metadata updates cannot
-- change the immutable eligibility ledger.
CREATE TABLE private.pending_signup_eligibility(user_id uuid PRIMARY KEY,data jsonb NOT NULL);
ALTER TABLE private.pending_signup_eligibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.pending_signup_eligibility FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.capture_signup_eligibility() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE payload jsonb;birth date;mail text;
BEGIN
 IF TG_OP='INSERT' AND NEW.raw_user_meta_data?'signup_eligibility' THEN
  payload=NEW.raw_user_meta_data->'signup_eligibility';
  IF jsonb_typeof(payload)<>'object' OR payload->'accepted' IS DISTINCT FROM 'true'::jsonb OR payload->>'policy_version' IS DISTINCT FROM 'bd-launch-2026-11-09' THEN RAISE EXCEPTION 'Accept the current signup notices'; END IF;
  IF coalesce(payload->>'birth_date','')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'A valid birth date is required'; END IF;
  birth=(payload->>'birth_date')::date;
  IF birth>current_date-interval '13 years' OR birth<current_date-interval '120 years' THEN RAISE EXCEPTION 'Accounts are available from age 13'; END IF;
  mail=lower(trim(payload->>'guardian_email'));
  IF birth>current_date-interval '18 years' AND (mail IS NULL OR length(mail)>254 OR mail!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' OR mail=lower(NEW.email)) THEN RAISE EXCEPTION 'A separate guardian email is required'; END IF;
  INSERT INTO private.pending_signup_eligibility VALUES(NEW.id,jsonb_build_object('birth_date',birth,'guardian_email',CASE WHEN birth>current_date-interval '18 years' THEN mail END));
 END IF;
 NEW.raw_user_meta_data=NEW.raw_user_meta_data-'signup_eligibility';
 RETURN NEW;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RAISE EXCEPTION 'A valid birth date is required';
END $$;
REVOKE ALL ON FUNCTION private.capture_signup_eligibility() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER capture_signup_eligibility BEFORE INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION private.capture_signup_eligibility();
CREATE FUNCTION private.finish_signup_eligibility() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE payload jsonb;birth date;
BEGIN
 SELECT data INTO payload FROM private.pending_signup_eligibility WHERE user_id=NEW.id;
 IF payload IS NOT NULL THEN
  birth=(payload->>'birth_date')::date;
  INSERT INTO private.account_eligibility(user_id,birth_date,policy_version,guardian_email,guardian_status)
  VALUES(NEW.id,birth,'bd-launch-2026-11-09',payload->>'guardian_email',CASE WHEN birth>current_date-interval '18 years' THEN 'pending' ELSE 'not_required' END);
  IF birth>current_date-interval '18 years' THEN UPDATE public.profiles SET privacy_mode='private' WHERE id=NEW.id; END IF;
  INSERT INTO private.guardian_audit(child_id,actor_id,action) VALUES(NEW.id,NEW.id,'account_setup_at_signup');
  DELETE FROM private.pending_signup_eligibility WHERE user_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.finish_signup_eligibility() FROM PUBLIC,anon,authenticated,service_role;
-- Runs after on_auth_user_created, so the profile exists before teen defaults.
CREATE TRIGGER zz_finish_signup_eligibility AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.finish_signup_eligibility();
