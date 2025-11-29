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

    const { data: banks } = await supabase
      .from('banks')
      .select('id, name, code')
      .limit(1);

    if (!banks || banks.length === 0) {
      throw new Error('No banks found in database');
    }

    const bankId = banks[0].id;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'engineer@fieldservice.com',
      password: 'engineer123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Engineer',
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ message: 'Engineer user already exists' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      throw authError;
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: 'engineer@fieldservice.com',
        full_name: 'Test Engineer',
        phone: '+1234567890',
        role: 'engineer',
        status: 'active',
        bank_id: bankId,
        region: 'North',
      });

    if (profileError) {
      if (!profileError.message.includes('duplicate')) {
        throw profileError;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Test engineer created successfully',
        credentials: {
          email: 'engineer@fieldservice.com',
          password: 'engineer123',
        },
        bank: banks[0],
        user_id: authData.user.id,
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