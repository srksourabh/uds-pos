import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SwapDeviceRequest {
  call_id: string;
  old_device_id: string;
  new_device_id: string;
  swap_reason: string;
  photo_ids: string[];
  completed_at?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
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
      return errorResponse('Invalid or expired token', 'UNAUTHORIZED', 401);
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, bank_id')
      .eq('user_id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'engineer')) {
      return errorResponse('Insufficient permissions', 'FORBIDDEN', 403);
    }

    const body = await req.json() as SwapDeviceRequest;
    const {
      call_id,
      old_device_id,
      new_device_id,
      swap_reason,
      photo_ids,
      completed_at = new Date().toISOString(),
    } = body;

    if (!call_id || !old_device_id || !new_device_id || !swap_reason || !photo_ids) {
      return errorResponse('Missing required fields', 'MISSING_REQUIRED_FIELDS', 400);
    }

    if (swap_reason.length < 10) {
      return errorResponse('Swap reason must be at least 10 characters', 'REASON_TOO_SHORT', 400);
    }

    if (!Array.isArray(photo_ids) || photo_ids.length < 4) {
      return errorResponse('At least 4 photos required for swap (old before/after, new before/after)', 'INSUFFICIENT_SWAP_PHOTOS', 400);
    }

    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, banks(bank_code)')
      .eq('id', call_id)
      .single();

    if (callError || !call) {
      return errorResponse(`Call with ID ${call_id} not found`, 'CALL_NOT_FOUND', 404);
    }

    if (call.call_type !== 'swap') {
      return errorResponse('This operation requires a swap-type call', 'INVALID_CALL_TYPE', 400);
    }

    if (profile.role === 'engineer' && call.assigned_engineer !== user.id) {
      return errorResponse('This call is not assigned to you', 'CALL_NOT_ASSIGNED_TO_YOU', 403);
    }

    const { data: oldDevice, error: oldDeviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', old_device_id)
      .single();

    if (oldDeviceError || !oldDevice) {
      return errorResponse(`Old device with ID ${old_device_id} not found`, 'DEVICE_NOT_FOUND', 404);
    }

    if (oldDevice.status !== 'installed') {
      return errorResponse('Old device must be installed to swap', 'OLD_DEVICE_NOT_INSTALLED', 400);
    }

    const { data: newDevice, error: newDeviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', new_device_id)
      .single();

    if (newDeviceError || !newDevice) {
      return errorResponse(`New device with ID ${new_device_id} not found`, 'DEVICE_NOT_FOUND', 404);
    }

    if (newDevice.status !== 'issued') {
      return errorResponse('New device must be issued to engineer before swap', 'NEW_DEVICE_NOT_ISSUED', 400);
    }

    if (oldDevice.device_bank !== call.client_bank || newDevice.device_bank !== call.client_bank) {
      return errorResponse('Device banks must match call bank', 'BANK_MISMATCH', 400);
    }

    const { error: oldDeviceUpdate } = await supabase
      .from('devices')
      .update({
        status: oldDevice.fault_description ? 'faulty' : 'returned',
        installed_at_client: null,
        assigned_to: oldDevice.fault_description ? null : user.id,
      })
      .eq('id', old_device_id);

    if (oldDeviceUpdate) {
      console.error('Old device update error:', oldDeviceUpdate);
      return errorResponse('Failed to update old device', 'INTERNAL_SERVER_ERROR', 500);
    }

    const { error: newDeviceUpdate } = await supabase
      .from('devices')
      .update({
        status: 'installed',
        installed_at_client: call.installation_address,
        assigned_to: null,
      })
      .eq('id', new_device_id);

    if (newDeviceUpdate) {
      console.error('New device update error:', newDeviceUpdate);
      return errorResponse('Failed to update new device', 'INTERNAL_SERVER_ERROR', 500);
    }

    await supabase
      .from('stock_movements')
      .insert([
        {
          device_id: old_device_id,
          movement_type: 'swap_out',
          from_status: 'installed',
          to_status: oldDevice.fault_description ? 'faulty' : 'returned',
          from_location: call.installation_address,
          to_location: oldDevice.fault_description ? 'faulty_stock' : 'engineer',
          performed_by: user.id,
          related_call: call_id,
          notes: swap_reason,
        },
        {
          device_id: new_device_id,
          movement_type: 'swap_in',
          from_status: 'issued',
          to_status: 'installed',
          from_location: 'engineer',
          to_location: call.installation_address,
          performed_by: user.id,
          related_call: call_id,
          notes: swap_reason,
        },
      ]);

    await supabase
      .from('call_devices')
      .update({ device_id: new_device_id })
      .eq('call_id', call_id)
      .eq('device_id', old_device_id);

    logStructured('info', 'swap-device', {
      call_id,
      old_device_id,
      new_device_id,
      user_id: user.id,
      duration_ms: Date.now() - startTime,
    });

    const response = {
      success: true,
      data: {
        call_id,
        call_number: call.call_number,
        old_device: {
          device_id: oldDevice.id,
          serial_number: oldDevice.serial_number,
          new_status: oldDevice.fault_description ? 'faulty' : 'returned',
        },
        new_device: {
          device_id: newDevice.id,
          serial_number: newDevice.serial_number,
          new_status: 'installed',
          installed_at: call.installation_address,
        },
        stock_movements_created: 2,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('swap-device error:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500);
  }
});

function errorResponse(message: string, code: string, status: number) {
  return new Response(
    JSON.stringify({
      error: message,
      error_code: code,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
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
