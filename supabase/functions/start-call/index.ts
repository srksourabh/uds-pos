import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface StartCallRequest {
  call_id: string;
  start_gps?: {
    latitude: number;
    longitude: number;
  };
  start_timestamp: string;
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
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as StartCallRequest;
    const { call_id, start_gps, start_timestamp } = body;

    if (!call_id || !start_timestamp) {
      throw new Error('call_id and start_timestamp are required');
    }

    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !call) {
      throw new Error('Call not found');
    }

    if (call.assigned_engineer !== user.id) {
      throw new Error('Call not assigned to you');
    }

    if (call.status !== 'assigned') {
      throw new Error(`Call status is ${call.status}, expected 'assigned'`);
    }

    const metadata = call.metadata || {};
    if (start_gps) {
      metadata.start_gps = start_gps;
    }

    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'in_progress',
        started_at: start_timestamp,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', call_id);

    if (updateError) throw updateError;

    await supabase.from('call_history').insert({
      call_id,
      from_status: 'assigned',
      to_status: 'in_progress',
      actor_id: user.id,
      notes: 'Call started by engineer',
    });

    return new Response(
      JSON.stringify({
        success: true,
        call_id,
        started_at: start_timestamp,
        message: 'Call started successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Start call error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});