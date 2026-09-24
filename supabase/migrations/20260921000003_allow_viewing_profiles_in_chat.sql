-- Разрешить всем авторизованным пользователям видеть базовую информацию о других профилях (необходимо для чата)
DROP POLICY IF EXISTS "Anyone view all profiles" ON public.profiles;
CREATE POLICY "Anyone view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Разрешить всем авторизованным пользователям видеть назначенные роли (необходимо для бейджей в чате)
DROP POLICY IF EXISTS "Anyone view all roles" ON public.user_roles;
CREATE POLICY "Anyone view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);
