ALTER TABLE public.profiles 
ADD COLUMN first_name_translations jsonb DEFAULT '{}'::jsonb,
ADD COLUMN last_name_translations jsonb DEFAULT '{}'::jsonb;
