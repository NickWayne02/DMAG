
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  site_name text,
  status text NOT NULL DEFAULT 'working' CHECK (status IN ('working','lunch','finished')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  lunch_started_at timestamptz,
  lunch_total_ms bigint NOT NULL DEFAULT 0,
  lunch_intervals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shifts_user_started_idx ON public.shifts(user_id, started_at DESC);
CREATE INDEX shifts_active_idx ON public.shifts(ended_at) WHERE ended_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own shifts"
ON public.shifts FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all shifts"
ON public.shifts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER shifts_set_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
