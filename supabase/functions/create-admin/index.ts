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

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@fieldservice.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        full_name: 'System Administrator',
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ message: 'Admin user already exists' }),
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
        email: 'admin@fieldservice.com',
        full_name: 'System Administrator',
        phone: '+1234567890',
        role: 'admin',
        active: true,
      });

    if (profileError) {
      if (!profileError.message.includes('duplicate')) {
        throw profileError;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Admin user created successfully',
        user: { email: authData.user.email, id: authData.user.id },
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