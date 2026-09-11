ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS preset_id UUID REFERENCES public.app_branding_presets(id) ON DELETE SET NULL;
