-- Widen only the reading text preference; preserve owner RLS and other checks.
ALTER TABLE public.diary_settings DROP CONSTRAINT diary_settings_font_size_check;
ALTER TABLE public.diary_settings ADD CONSTRAINT diary_settings_font_size_check CHECK (font_size BETWEEN 8 AND 24);
