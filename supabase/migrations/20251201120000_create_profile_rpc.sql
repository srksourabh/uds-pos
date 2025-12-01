-- Create RPC function to get user profile (bypasses RLS issues)
-- This function uses SECURITY DEFINER to bypass RLS policies

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM user_profiles WHERE id = auth.uid();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Function to get profile by ID (for admins or self)
CREATE OR REPLACE FUNCTION public.get_profile_by_id(profile_id UUID)
RETURNS SETOF user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Get caller's role
  SELECT role INTO caller_role FROM user_profiles WHERE id = auth.uid();

  -- Allow if admin or requesting own profile
  IF caller_role = 'admin' OR profile_id = auth.uid() THEN
    RETURN QUERY SELECT * FROM user_profiles WHERE id = profile_id;
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_by_id(UUID) TO authenticated;

-- Function to upsert profile (for first-time setup)
CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'engineer',
  p_status TEXT DEFAULT 'pending_approval'
)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_profiles;
BEGIN
  INSERT INTO user_profiles (id, email, full_name, phone, role, status, active, created_at, updated_at)
  VALUES (
    auth.uid(),
    COALESCE(p_email, (SELECT email FROM auth.users WHERE id = auth.uid())),
    p_full_name,
    p_phone,
    p_role::user_role,
    p_status::user_status,
    CASE WHEN p_status = 'active' THEN true ELSE false END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- IMPORTANT: Also fix the RLS issue by completely resetting policies
-- Disable RLS first
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies using DO block
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', r.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create ONLY one simple policy - users can access their own row
CREATE POLICY "self_access" ON user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Also allow service role full access (needed for Edge Functions)
CREATE POLICY "service_role_access" ON user_profiles FOR ALL TO service_role
USING (true) WITH CHECK (true);
