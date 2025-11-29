import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AuthValidationResult {
  valid: boolean;
  user?: {
    id: string;
    email?: string;
    phone?: string;
  };
  profile?: {
    id: string;
    role: string;
    status: string;
    bank_id?: string;
  };
  error?: string;
}

async function validateAuth(authHeader: string | null): Promise<AuthValidationResult> {
  if (!authHeader) {
    return { valid: false, error: 'No authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader }
    }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, role, status, bank_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { valid: false, error: 'Profile not found' };
  }

  if (profile.status !== 'active') {
    return { valid: false, error: `Account status: ${profile.status}` };
  }

  return {
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
    },
    profile: {
      id: profile.id,
      role: profile.role,
      status: profile.status,
      bank_id: profile.bank_id || undefined,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const validation = await validateAuth(authHeader);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Auth valid',
        user: validation.user,
        profile: validation.profile,
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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});