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
      .select('role, status, bank_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      deviceId, 
      faultDescription, 
      faultCategory, 
      severity = 'major',
      requiresRepair = true,
      estimatedCost,
      createSwapCall = false,
    } = await req.json();

    if (!deviceId || !faultDescription || !faultCategory) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (faultDescription.length < 20) {
      return new Response(JSON.stringify({ error: 'Fault description must be at least 20 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: device } = await supabase
      .from('devices')
      .select('*, bank:device_bank(id, name)')
      .eq('id', deviceId)
      .single();

    if (!device) {
      return new Response(JSON.stringify({ error: 'Device not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.role === 'engineer' && device.assigned_to !== user.id) {
      return new Response(JSON.stringify({ error: 'Device not assigned to you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const oldStatus = device.status;
    const metadata = device.metadata || {};
    metadata.faulty_date = new Date().toISOString();
    metadata.fault_description = faultDescription;
    metadata.fault_category = faultCategory;
    metadata.fault_severity = severity;
    metadata.requires_repair = requiresRepair;
    if (estimatedCost) {
      metadata.estimated_repair_cost = estimatedCost;
    }
    metadata.reported_by = user.id;

    const { error: updateError } = await supabase
      .from('devices')
      .update({
        status: 'faulty',
        metadata: metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deviceId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('stock_movements').insert({
      device_id: deviceId,
      movement_type: 'status_change',
      from_status: oldStatus,
      to_status: 'faulty',
      from_engineer: device.assigned_to,
      to_engineer: device.assigned_to,
      actor_id: user.id,
      reason: `Device marked as faulty: ${faultCategory}`,
      notes: faultDescription,
      metadata: { fault_category: faultCategory, severity: severity },
    });

    const alertSeverity = severity === 'critical' ? 'critical' : severity === 'major' ? 'warning' : 'info';
    
    await supabase.from('stock_alerts').insert({
      alert_type: 'faulty_device',
      severity: alertSeverity,
      bank_id: device.device_bank,
      device_id: deviceId,
      title: `Faulty Device: ${device.serial_number}`,
      message: `${device.model} (${device.serial_number}) reported as faulty. Category: ${faultCategory}. ${faultDescription}`,
      status: 'active',
      auto_generated: false,
      metadata: {
        fault_category: faultCategory,
        severity: severity,
        requires_repair: requiresRepair,
        reported_by: user.id,
      },
    });

    let swapCallId = null;
    if (createSwapCall && device.status === 'installed' && device.installed_at_client) {
      const callNumber = `SWAP-${Date.now().toString(36).toUpperCase()}`;
      
      const { data: call, error: callError } = await supabase
        .from('calls')
        .insert({
          call_number: callNumber,
          type: 'swap',
          status: 'pending',
          client_bank: device.device_bank,
          client_name: device.installed_at_client,
          client_address: 'To be confirmed',
          scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          priority: severity === 'critical' ? 'urgent' : 'high',
          description: `Swap faulty device ${device.serial_number}. Fault: ${faultDescription}`,
          metadata: {
            faulty_device_id: deviceId,
            auto_generated: true,
          },
        })
        .select('id')
        .single();

      if (!callError && call) {
        swapCallId = call.id;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Device marked as faulty',
      deviceId: deviceId,
      swapCallId: swapCallId,
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