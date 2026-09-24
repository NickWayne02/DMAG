-- Add name_translations to sites table
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS name_translations JSONB DEFAULT '{}'::jsonb;
