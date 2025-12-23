import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

type TransferType = 'engineer_to_engineer' | 'engineer_to_warehouse' | 'warehouse_to_engineer';

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

    const { deviceId, transferType, toEngineerId, reason, notes = '' } = await req.json();

    if (!deviceId || !transferType || !reason) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (reason.length < 10) {
      return new Response(JSON.stringify({ error: 'Reason must be at least 10 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: device } = await supabase
      .from('devices')
      .select('*, assigned_engineer:assigned_to(id, bank_id)')
      .eq('id', deviceId)
      .single();

    if (!device) {
      return new Response(JSON.stringify({ error: 'Device not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updates: any = {};
    const movementData: any = {
      device_id: deviceId,
      movement_type: 'transfer',
      from_status: device.status,
      actor_id: user.id,
      reason: reason,
      notes: notes,
    };

    if (transferType === 'engineer_to_engineer') {
      if (!toEngineerId) {
        return new Response(JSON.stringify({ error: 'Target engineer required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (device.assigned_to === toEngineerId) {
        return new Response(JSON.stringify({ error: 'Source and destination cannot be the same' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: toEngineer } = await supabase
        .from('user_profiles')
        .select('id, bank_id, status, role, full_name')
        .eq('id', toEngineerId)
        .single();

      if (!toEngineer || toEngineer.role !== 'engineer') {
        return new Response(JSON.stringify({ error: 'Invalid target engineer' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (toEngineer.status !== 'active') {
        return new Response(JSON.stringify({ error: 'Target engineer is not active' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (device.device_bank !== toEngineer.bank_id) {
        return new Response(JSON.stringify({ error: 'Engineers must be from the same bank' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      updates = { assigned_to: toEngineerId };
      movementData.from_engineer = device.assigned_to;
      movementData.to_engineer = toEngineerId;
      movementData.to_status = device.status;
      movementData.from_location = device.assigned_engineer?.full_name || 'Unknown';
      movementData.to_location = toEngineer.full_name;
    } else if (transferType === 'engineer_to_warehouse') {
      if (!['issued', 'installed'].includes(device.status)) {
        return new Response(JSON.stringify({ error: 'Device must be issued or installed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      updates = { 
        status: 'returned',
        assigned_to: null,
      };
      movementData.movement_type = 'return';
      movementData.from_engineer = device.assigned_to;
      movementData.to_status = 'returned';
      movementData.from_location = device.assigned_engineer?.full_name || 'Engineer';
      movementData.to_location = 'Central Warehouse';
    } else if (transferType === 'warehouse_to_engineer') {
      if (!toEngineerId) {
        return new Response(JSON.stringify({ error: 'Target engineer required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!['warehouse', 'returned'].includes(device.status)) {
        return new Response(JSON.stringify({ error: 'Device must be in warehouse' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: toEngineer } = await supabase
        .from('user_profiles')
        .select('id, bank_id, status, role, full_name')
        .eq('id', toEngineerId)
        .single();

      if (!toEngineer || toEngineer.role !== 'engineer' || toEngineer.status !== 'active') {
        return new Response(JSON.stringify({ error: 'Invalid target engineer' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (device.device_bank !== toEngineer.bank_id) {
        return new Response(JSON.stringify({ error: 'Bank mismatch' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      updates = { 
        status: 'issued',
        assigned_to: toEngineerId,
      };
      movementData.movement_type = 'issuance';
      movementData.to_engineer = toEngineerId;
      movementData.to_status = 'issued';
      movementData.from_location = 'Central Warehouse';
      movementData.to_location = toEngineer.full_name;
    }

    const { error: updateError } = await supabase
      .from('devices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', deviceId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert(movementData);

    if (movementError) {
      console.error('Movement log error:', movementError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Transfer completed successfully',
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