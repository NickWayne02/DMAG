-- Add 'label' column to profiles and sites for multi-tenancy
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS label text;

-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_label ON public.profiles(label);
CREATE INDEX IF NOT EXISTS idx_sites_label ON public.sites(label);
