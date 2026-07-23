
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'brigadier', 'employee');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  language TEXT NOT NULL DEFAULT 'ru',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile + default employee role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.phone,
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();



ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;


REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;


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



CREATE POLICY "Auth can read photo-reports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photo-reports');

CREATE POLICY "Auth can upload photo-reports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photo-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can update photo-reports"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photo-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can delete photo-reports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photo-reports' AND auth.uid()::text = (storage.foldername(name))[1]);


create type public.chat_channel_type as enum ('general', 'direct', 'site');

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_type public.chat_channel_type not null,
  channel_id text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  content text not null,
  source_lang text not null default 'ru',
  created_at timestamptz not null default now()
);

create index chat_messages_channel_idx on public.chat_messages (channel_type, channel_id, created_at);

grant select, insert on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;

alter table public.chat_messages enable row level security;

create policy "Authenticated can read chat messages" on public.chat_messages for select to authenticated using (true);
create policy "Authenticated can write own chat messages" on public.chat_messages for insert to authenticated with check (auth.uid() = author_id);

alter publication supabase_realtime add table public.chat_messages;

-- 1) Promote existing test accounts to admin (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('admin@dmag.de', 'manager@dmag.de')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Update the signup trigger so the two seeded emails get admin automatically,
--    everyone else stays employee by default.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.phone,
    NEW.email
  );

  IF lower(COALESCE(NEW.email, '')) IN ('admin@dmag.de', 'manager@dmag.de') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Lock down role mutations: only admins/super-admins can write.
--    Regular users may still read their own row (existing read policy is kept).
DROP POLICY IF EXISTS "Only admins manage roles" ON public.user_roles;
CREATE POLICY "Only admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);



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



-- Allow admins/super_admins to manage shifts of anyone (edit/insert/delete)
DROP POLICY IF EXISTS "Admins manage all shifts" ON public.shifts;
CREATE POLICY "Admins manage all shifts"
ON public.shifts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Allow admins/super_admins to view & update all profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));


GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

CREATE POLICY "Super admins can delete chat messages" ON public.chat_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));


ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS start_lat double precision,
  ADD COLUMN IF NOT EXISTS start_lng double precision,
  ADD COLUMN IF NOT EXISTS start_city text,
  ADD COLUMN IF NOT EXISTS end_lat double precision,
  ADD COLUMN IF NOT EXISTS end_lng double precision,
  ADD COLUMN IF NOT EXISTS end_city text;


