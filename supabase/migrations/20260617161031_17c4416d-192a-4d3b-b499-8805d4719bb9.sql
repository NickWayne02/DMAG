
-- Sites (construction objects)
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  customer text,
  comment text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sites" ON public.sites
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create sites" ON public.sites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or admin can update sites" ON public.sites
  FOR UPDATE TO authenticated USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );
CREATE POLICY "Admin can delete sites" ON public.sites
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER sites_set_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Criticality enum
CREATE TYPE public.report_criticality AS ENUM ('info', 'important', 'urgent');

-- Photo reports
CREATE TABLE public.photo_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  description text,
  criticality public.report_criticality NOT NULL DEFAULT 'info',
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_reports TO authenticated;
GRANT ALL ON public.photo_reports TO service_role;

ALTER TABLE public.photo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view photo reports" ON public.photo_reports
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create photo reports" ON public.photo_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author or admin can update photo reports" ON public.photo_reports
  FOR UPDATE TO authenticated USING (
    auth.uid() = author_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );
CREATE POLICY "Author or admin can delete photo reports" ON public.photo_reports
  FOR DELETE TO authenticated USING (
    auth.uid() = author_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER photo_reports_set_updated_at
  BEFORE UPDATE ON public.photo_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX photo_reports_site_id_idx ON public.photo_reports(site_id);
CREATE INDEX photo_reports_created_at_idx ON public.photo_reports(created_at DESC);
