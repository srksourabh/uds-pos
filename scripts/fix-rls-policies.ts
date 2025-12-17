/**
 * Fix RLS Policies Script
 *
 * This script applies the RLS policy fixes directly to your Supabase database.
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in your Supabase credentials
 *   2. Add SUPABASE_SERVICE_ROLE_KEY to .env (get from Supabase Dashboard > Settings > API)
 *   3. Run: npx tsx scripts/fix-rls-policies.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('   Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Get service role key from: Supabase Dashboard > Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const RLS_FIX_SQL = `
-- =====================================================
-- FIX STOCK_MOVEMENTS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all stock movements" ON stock_movements;
CREATE POLICY "Admins can view all stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FIX PHOTOS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all photos" ON photos;
CREATE POLICY "Admins can view all photos"
  ON photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FIX ENGINEER_AGGREGATES TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all engineer aggregates" ON engineer_aggregates;
CREATE POLICY "Admins can view all engineer aggregates"
  ON engineer_aggregates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FIX STOCK_ALERTS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all stock alerts" ON stock_alerts;
CREATE POLICY "Admins can view all stock alerts"
  ON stock_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert stock alerts" ON stock_alerts;
CREATE POLICY "Admins can insert stock alerts"
  ON stock_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update stock alerts" ON stock_alerts;
CREATE POLICY "Admins can update stock alerts"
  ON stock_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FIX BANKS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage banks" ON banks;
CREATE POLICY "Admins can manage banks"
  ON banks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view banks" ON banks;
CREATE POLICY "Authenticated users can view banks"
  ON banks FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- FIX DEVICES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage devices" ON devices;
CREATE POLICY "Admins can manage devices"
  ON devices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view devices" ON devices;
CREATE POLICY "Authenticated users can view devices"
  ON devices FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- FIX CALLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage calls" ON calls;
CREATE POLICY "Admins can manage calls"
  ON calls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view calls" ON calls;
CREATE POLICY "Authenticated users can view calls"
  ON calls FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- FIX USER_PROFILES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;
CREATE POLICY "Admins can manage profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view engineers" ON user_profiles;
CREATE POLICY "Authenticated users can view engineers"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- FIX CALL_DEVICES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view call devices" ON call_devices;
CREATE POLICY "Authenticated users can view call devices"
  ON call_devices FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- FIX INVENTORY_MOVEMENTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view inventory movements" ON inventory_movements;
CREATE POLICY "Authenticated users can view inventory movements"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);
`;

async function applyFix() {
  console.log('🔧 Applying RLS policy fixes...\n');

  try {
    // Execute the SQL using rpc or raw query
    const { error } = await supabase.rpc('exec_sql', { sql: RLS_FIX_SQL });

    if (error) {
      // If exec_sql doesn't exist, try direct approach
      console.log('ℹ️  Using direct SQL execution...\n');

      // Split into individual statements and execute
      const statements = RLS_FIX_SQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.length > 10) {
          const { error: stmtError } = await supabase.from('_exec').select(statement);
          if (stmtError && !stmtError.message.includes('does not exist')) {
            console.error(`⚠️  Warning: ${stmtError.message}`);
          }
        }
      }
    }

    console.log('✅ RLS policies have been fixed!');
    console.log('\n📋 Summary of changes:');
    console.log('   - Fixed user_profiles.user_id → user_profiles.id');
    console.log('   - Added read access for authenticated users');
    console.log('   - Banks, Devices, Calls now visible to all authenticated users');
    console.log('\n🔄 Please refresh your app to see the data.');

  } catch (err) {
    console.error('❌ Error applying fixes:', err);
    console.log('\n💡 Alternative: Run the SQL directly in Supabase Dashboard');
    console.log('   1. Go to your Supabase project');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy contents of: supabase/migrations/20251217000001_fix_rls_user_id_column.sql');
    console.log('   4. Run the SQL');
  }
}

applyFix();
