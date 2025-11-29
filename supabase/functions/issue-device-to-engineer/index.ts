import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || profile.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { deviceIds, engineerId, notes = '' } = await req.json();

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Device IDs array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!engineerId) {
      return new Response(JSON.stringify({ error: 'Engineer ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: engineer } = await supabase
      .from('user_profiles')
      .select('id, bank_id, status, role')
      .eq('id', engineerId)
      .single();

    if (!engineer) {
      return new Response(JSON.stringify({ error: 'Engineer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (engineer.role !== 'engineer') {
      return new Response(JSON.stringify({ error: 'Target user is not an engineer' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (engineer.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Engineer is not active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: devices } = await supabase
      .from('devices')
      .select('id, serial_number, device_bank, status')
      .in('id', deviceIds);

    if (!devices || devices.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid devices found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const errors: string[] = [];
    const successIds: string[] = [];

    for (const device of devices) {
      if (!['warehouse', 'returned'].includes(device.status)) {
        errors.push(`${device.serial_number}: Not available (status: ${device.status})`);
        continue;
      }

      if (device.device_bank !== engineer.bank_id) {
        errors.push(`${device.serial_number}: Bank mismatch`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('devices')
        .update({
          status: 'issued',
          assigned_to: engineerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', device.id);

      if (updateError) {
        errors.push(`${device.serial_number}: ${updateError.message}`);
        continue;
      }

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          device_id: device.id,
          movement_type: 'issuance',
          from_status: device.status,
          to_status: 'issued',
          from_location: 'Central Warehouse',
          to_engineer: engineerId,
          actor_id: user.id,
          reason: 'Issued by admin',
          notes: notes,
        });

      if (movementError) {
        errors.push(`${device.serial_number}: Movement log failed`);
      } else {
        successIds.push(device.id);
      }
    }

    return new Response(JSON.stringify({
      success: errors.length === 0,
      successCount: successIds.length,
      errorCount: errors.length,
      errors: errors,
      issuedDeviceIds: successIds,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});