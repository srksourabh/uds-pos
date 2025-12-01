import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IssueBulkRequest {
  deviceIds: string[];
  engineerId: string;
  notes?: string;
  idempotency_key?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 'UNAUTHORIZED', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return errorResponse('Invalid token', 'UNAUTHORIZED', 401);
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return errorResponse('Admin role required', 'FORBIDDEN', 403);
    }

    const body = await req.json() as IssueBulkRequest;
    const { deviceIds, engineerId, notes, idempotency_key } = body;

    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return errorResponse('deviceIds must be non-empty array', 'MISSING_REQUIRED_FIELDS', 400);
    }

    if (deviceIds.length > 100) {
      return errorResponse('Cannot issue more than 100 devices at once', 'BULK_LIMIT_EXCEEDED', 400);
    }

    if (!engineerId) {
      return errorResponse('engineerId is required', 'MISSING_REQUIRED_FIELDS', 400);
    }

    const idemKey = idempotency_key || createHash('sha256').update(`issue-${engineerId}-${deviceIds.join(',')}`).digest('hex');
    
    const { data: existingResult } = await supabase.rpc('check_idempotency_key', {
      p_key: idemKey,
      p_operation: 'issue_device_to_engineer',
      p_user_id: user.id,
      p_ttl_seconds: 300,
    });

    if (existingResult) {
      return new Response(JSON.stringify(existingResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: engineer, error: engineerError } = await supabase
      .from('user_profiles')
      .select('*, banks!user_profiles_bank_id_fkey(code, name)')
      .eq('id', engineerId)
      .eq('role', 'engineer')
      .single();

    if (engineerError || !engineer) {
      return errorResponse('Engineer not found', 'ENGINEER_NOT_FOUND', 404);
    }

    if (!engineer.active || engineer.status !== 'active') {
      return errorResponse('Engineer is not active', 'ENGINEER_NOT_ACTIVE', 400);
    }

    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .in('id', deviceIds);

    if (devicesError || !devices || devices.length === 0) {
      return errorResponse('No valid devices found', 'DEVICE_NOT_FOUND', 404);
    }

    const successfulIds: string[] = [];
    const errors: string[] = [];
    const movements: any[] = [];

    for (const device of devices) {
      if (device.status !== 'warehouse') {
        errors.push(`Device ${device.serial_number}: not in warehouse (status: ${device.status})`);
        continue;
      }

      if (device.device_bank !== engineer.bank_id) {
        errors.push(`Device ${device.serial_number}: bank mismatch`);
        continue;
      }

      if (device.status === 'faulty') {
        errors.push(`Device ${device.serial_number}: marked as faulty`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('devices')
        .update({
          status: 'issued',
          assigned_to: engineerId,
          issued_at: new Date().toISOString(),
        })
        .eq('id', device.id)
        .eq('status', 'warehouse');

      if (updateError) {
        errors.push(`Device ${device.serial_number}: ${updateError.message}`);
        continue;
      }

      successfulIds.push(device.id);
      movements.push({
        device_id: device.id,
        movement_type: 'issue',
        from_status: 'warehouse',
        to_status: 'issued',
        from_location: 'warehouse',
        to_location: 'engineer',
        performed_by: user.id,
        notes: notes || `Issued to ${engineer.full_name}`,
      });
    }

    if (movements.length > 0) {
      await supabase.from('stock_movements').insert(movements);
    }

    await supabase.rpc('update_engineer_aggregates', {
      p_engineer_id: engineerId,
    });

    const { data: updatedAgg } = await supabase
      .from('engineer_aggregates')
      .select('current_device_count')
      .eq('engineer_id', engineerId)
      .single();

    const response = {
      success: true,
      successCount: successfulIds.length,
      errorCount: errors.length,
      errors,
      issuedDeviceIds: successfulIds,
      engineer: {
        id: engineer.id,
        name: engineer.full_name,
        bank: engineer.banks?.code,
        new_stock_count: updatedAgg?.current_device_count || successfulIds.length,
      },
      stock_movements_created: movements.length,
    };

    await supabase.rpc('store_idempotency_key', {
      p_key: idemKey,
      p_operation: 'issue_device_to_engineer',
      p_response: response,
      p_user_id: user.id,
      p_ttl_seconds: 300,
    });

    logStructured('info', 'issue-device-to-engineer', {
      engineer_id: engineerId,
      devices_issued: successfulIds.length,
      duration_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('issue-device-to-engineer error:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500);
  }
});

function errorResponse(message: string, code: string, status: number) {
  return new Response(
    JSON.stringify({ error: message, error_code: code }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  );
}

function logStructured(level: string, functionName: string, payload: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    function: functionName,
    ...payload,
  }));
}
