-- 1. Add fcm_token to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token text;
