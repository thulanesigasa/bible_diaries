-- Narrow hardening only. This does not resolve the separate launch blockers
-- documented in docs/PRODUCTION_SECURITY_REVIEW_2026-11-01.md.
-- Trigger execution does not require these functions to be public RPCs.
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- RLS does not protect TRUNCATE. App clients need ordinary row operations only.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.profiles, public.diaries, public.comments, public.likes,
  public.comment_likes, public.favorites, public.chats
FROM anon, authenticated;

-- This protects Storage uploads only; inline avatar strings in profiles still
-- require separate server-side validation and size limits.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';
