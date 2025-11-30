import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];

    // Create admin user
    try {
      await supabase.auth.admin.deleteUser('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    } catch (e) {
      // Ignore if doesn't exist
    }

    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@costar.test',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'System Administrator',
      },
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    });

    if (adminError && !adminError.message.includes('already registered')) {
      throw new Error(`Admin creation failed: ${adminError.message}`);
    }

    if (adminData?.user) {
      await supabase.from('user_profiles').upsert({
        id: adminData.user.id,
        email: 'admin@costar.test',
        full_name: 'System Administrator',
        role: 'admin',
        status: 'active',
        active: true,
      });
      results.push({ email: 'admin@costar.test', status: 'created' });
    }

    // Create engineer user
    try {
      await supabase.auth.admin.deleteUser('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
    } catch (e) {
      // Ignore if doesn't exist
    }

    // Get a bank ID for the engineer
    const { data: banks } = await supabase.from('banks').select('id').limit(1).maybeSingle();
    const bankId = banks?.id || '11111111-1111-1111-1111-111111111111';

    const { data: engineerData, error: engineerError } = await supabase.auth.admin.createUser({
      email: 'engineer@costar.test',
      password: 'Engineer123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Field Engineer',
      },
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    });

    if (engineerError && !engineerError.message.includes('already registered')) {
      throw new Error(`Engineer creation failed: ${engineerError.message}`);
    }

    if (engineerData?.user) {
      await supabase.from('user_profiles').upsert({
        id: engineerData.user.id,
        email: 'engineer@costar.test',
        full_name: 'Field Engineer',
        role: 'engineer',
        status: 'active',
        active: true,
        bank_id: bankId,
      });
      results.push({ email: 'engineer@costar.test', status: 'created' });
    }

    return new Response(
      JSON.stringify({
        message: 'Test users created successfully',
        users: results,
        credentials: {
          admin: { email: 'admin@costar.test', password: 'Admin123!' },
          engineer: { email: 'engineer@costar.test', password: 'Engineer123!' },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});