-- One owner-scoped read for both app clients. No additional activity columns exposed.
CREATE FUNCTION public.diary_notification_snapshot() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); result jsonb;
BEGIN
 IF actor IS NULL OR NOT private.active_member() THEN RAISE EXCEPTION 'Access unavailable' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
  'community',coalesce((SELECT jsonb_agg(to_jsonb(n)) FROM (SELECT id,kind,post_id,created_at,read_at FROM public.diary_activity WHERE recipient_id=actor ORDER BY created_at DESC,id DESC LIMIT 30)n),'[]'::jsonb),
  'system',coalesce((SELECT jsonb_agg(to_jsonb(n)) FROM (SELECT id,outcome,target,content_id,created_at,read_at FROM public.moderation_notifications WHERE user_id=actor ORDER BY created_at DESC,id DESC LIMIT 30)n),'[]'::jsonb),
  'unread',(SELECT count(id) FROM public.diary_activity WHERE recipient_id=actor AND read_at IS NULL)+(SELECT count(id) FROM public.moderation_notifications WHERE user_id=actor AND read_at IS NULL),
  'settings',coalesce((SELECT to_jsonb(s) FROM public.diary_settings s WHERE s.user_id=actor),'{}'::jsonb)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.diary_notification_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.diary_notification_snapshot() TO authenticated;

-- Receive-only private topics; clients cannot forge notifications or read other topics.
CREATE POLICY diary_activity_receive ON realtime.messages FOR SELECT TO authenticated
USING (extension='broadcast' AND topic='diary-activity:'||(SELECT auth.uid())::text
 AND topic=(SELECT realtime.topic()) AND (SELECT private.active_member()));

CREATE FUNCTION private.signal_diary_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE recipient uuid;
BEGIN
 IF TG_TABLE_NAME='diary_activity' THEN recipient=NEW.recipient_id;
 ELSE recipient=NEW.user_id; END IF;
 -- Only a wake-up signal: never broadcast identity, post content, source keys or reasons.
 BEGIN
  PERFORM realtime.send(jsonb_build_object('changed',true),'activity','diary-activity:'||recipient::text,true);
 EXCEPTION WHEN OTHERS THEN NULL; -- Durable records + client polling remain authoritative.
 END;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.signal_diary_activity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER activity_live_signal AFTER INSERT OR UPDATE OF read_at ON public.diary_activity
FOR EACH ROW EXECUTE FUNCTION private.signal_diary_activity();
CREATE TRIGGER review_live_signal AFTER INSERT OR UPDATE OF read_at ON public.moderation_notifications
FOR EACH ROW EXECUTE FUNCTION private.signal_diary_activity();
