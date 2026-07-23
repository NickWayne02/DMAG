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
