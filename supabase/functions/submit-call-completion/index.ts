import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SubmitCallCompletionRequest {
  call_id: string;
  resolution_notes: string;
  actual_duration_minutes: number;
  completion_timestamp: string;
  completion_gps?: { latitude: number; longitude: number };
  merchant_rating?: number;
  devices: Array<{
    device_id: string;
    serial_number: string;
    action: 'install' | 'swap_in' | 'swap_out' | 'remove' | 'inspect';
    notes?: string;
  }>;
  photo_urls?: string[];
  metadata?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

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

    const body = await req.json() as SubmitCallCompletionRequest;
    const {
      call_id,
      resolution_notes,
      actual_duration_minutes,
      completion_timestamp,
      completion_gps,
      merchant_rating,
      devices,
    } = body;

    if (!call_id || !resolution_notes || !actual_duration_minutes) {
      throw new Error('Missing required fields');
    }

    if (resolution_notes.length < 20) {
      throw new Error('Resolution notes must be at least 20 characters');
    }

    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !call) throw new Error('Call not found');
    if (call.assigned_engineer !== user.id) throw new Error('Call not assigned to you');
    if (call.status !== 'in_progress') {
      throw new Error(`Call status is ${call.status}, expected 'in_progress'`);
    }

    if (['install', 'swap'].includes(call.type) && devices.length === 0) {
      throw new Error('At least one device required for install/swap calls');
    }

    for (const device of devices) {
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .select('device_bank')
        .eq('id', device.device_id)
        .single();

      if (deviceError || !deviceData) {
        throw new Error(`Device ${device.serial_number} not found`);
      }

      if (deviceData.device_bank !== call.client_bank) {
        throw new Error(`Bank mismatch for device ${device.serial_number}`);
      }
    }

    const metadata = call.metadata || {};
    if (completion_gps) {
      metadata.completion_gps = completion_gps;
    }
    if (merchant_rating) {
      metadata.merchant_rating = merchant_rating;
    }

    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'completed',
        completed_at: completion_timestamp,
        resolution_notes,
        actual_duration_minutes,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', call_id);

    if (updateError) throw updateError;

    for (const device of devices) {
      if (['install', 'swap_in'].includes(device.action)) {
        await supabase
          .from('devices')
          .update({
            status: 'installed',
            installed_at_client: call.client_name,
            installation_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', device.device_id);
      } else if (['swap_out', 'remove'].includes(device.action)) {
        await supabase
          .from('devices')
          .update({
            status: 'returned',
            installed_at_client: null,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', device.device_id);
      }

      await supabase.from('call_devices').insert({
        call_id,
        device_id: device.device_id,
        action: device.action,
      });

      await supabase.from('stock_movements').insert({
        device_id: device.device_id,
        movement_type: 'status_change',
        from_status: 'issued',
        to_status: ['install', 'swap_in'].includes(device.action) ? 'installed' : 'returned',
        to_engineer: user.id,
        to_location: call.client_address,
        call_id,
        actor_id: user.id,
        reason: `Device ${device.action} for call ${call.call_number}`,
      });
    }

    await supabase.from('call_history').insert({
      call_id,
      from_status: 'in_progress',
      to_status: 'completed',
      actor_id: user.id,
      notes: 'Call completed by engineer',
    });

    return new Response(
      JSON.stringify({
        success: true,
        call_id,
        call_number: call.call_number,
        completed_at: completion_timestamp,
        devices_updated: devices.length,
        message: 'Call completed successfully!',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Submit call completion error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});