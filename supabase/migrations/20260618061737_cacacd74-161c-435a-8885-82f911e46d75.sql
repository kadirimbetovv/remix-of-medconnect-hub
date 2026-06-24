DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Authenticated users view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);