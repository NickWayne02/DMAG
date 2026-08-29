CREATE TABLE public.app_settings (
  id INT PRIMARY KEY CHECK (id = 1),
  app_name TEXT NOT NULL DEFAULT 'DMAG',
  app_logo_url TEXT
);

INSERT INTO public.app_settings (id, app_name, app_logo_url) VALUES (1, 'DMAG', NULL);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT SELECT ON public.app_settings TO anon;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can update app settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- Create public bucket for branding assets
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Assets are public"
  ON storage.objects FOR SELECT USING (bucket_id = 'assets');

CREATE POLICY "Admins can upload assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assets' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Admins can update assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assets' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
    )
  );
CREATE POLICY "Admins can delete assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assets' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
    )
  );
