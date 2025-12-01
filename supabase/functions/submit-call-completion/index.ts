import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SubmitRequest {
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

    const body = await req.json() as SubmitRequest;
    const {
      call_id,
      resolution_notes,
      actual_duration_minutes,
      completion_timestamp,
      completion_gps,
      merchant_rating,
      devices,
      photo_urls,
      idempotency_key,
    } = body;

    if (!call_id || !resolution_notes || !actual_duration_minutes || !completion_timestamp || !devices) {
      return errorResponse('Missing required fields', 'MISSING_REQUIRED_FIELDS', 400);
    }

    if (resolution_notes.length < 20) {
      return errorResponse('Resolution notes must be at least 20 characters', 'RESOLUTION_NOTES_TOO_SHORT', 400);
    }

    if (actual_duration_minutes < 1 || actual_duration_minutes > 1440) {
      return errorResponse('Duration must be between 1 and 1440 minutes', 'VALIDATION_ERROR', 400);
    }

    if (!Array.isArray(devices) || devices.length === 0) {
      return errorResponse('At least one device must be provided', 'NO_DEVICES_PROVIDED', 400);
    }

    if (merchant_rating && (merchant_rating < 1 || merchant_rating > 5)) {
      return errorResponse('Merchant rating must be between 1 and 5', 'VALIDATION_ERROR', 400);
    }

    const idemKey = idempotency_key || createHash('sha256').update(`${call_id}-${completion_timestamp}`).digest('hex');
    
    const { data: existingResult } = await supabase.rpc('check_idempotency_key', {
      p_key: idemKey,
      p_operation: 'submit_call_completion',
      p_user_id: user.id,
      p_ttl_seconds: 60,
    });

    if (existingResult) {
      return new Response(JSON.stringify(existingResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, banks(bank_code)')
      .eq('id', call_id)
      .single();

    if (callError || !call) {
      return errorResponse('Call not found', 'CALL_NOT_FOUND', 404);
    }

    if (call.assigned_engineer !== user.id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return errorResponse('This call is not assigned to you', 'CALL_NOT_ASSIGNED_TO_YOU', 403);
      }
    }

    if (call.status !== 'in_progress') {
      return errorResponse('Call must be in progress to complete', 'INVALID_CALL_STATUS', 400);
    }

    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'completed',
        completed_at: completion_timestamp,
        resolution_notes,
        actual_duration_minutes,
        completion_latitude: completion_gps?.latitude,
        completion_longitude: completion_gps?.longitude,
        merchant_rating,
      })
      .eq('id', call_id);

    if (updateError) {
      console.error('Call update error:', updateError);
      return errorResponse('Failed to update call', 'INTERNAL_SERVER_ERROR', 500);
    }

    const devicesProcessed = [];
    const movements = [];

    for (const deviceAction of devices) {
      const { data: device } = await supabase
        .from('devices')
        .select('*')
        .eq('id', deviceAction.device_id)
        .single();

      if (!device) {
        continue;
      }

      if (device.device_bank !== call.client_bank) {
        return errorResponse('Device bank mismatch', 'DEVICE_BANK_MISMATCH', 400);
      }

      let newStatus = device.status;
      let installedAt = device.installed_at_client;

      if (deviceAction.action === 'install') {
        newStatus = 'installed';
        installedAt = call.client_address;
        await supabase
          .from('devices')
          .update({
            status: 'installed',
            installed_at_client: call.client_address,
            assigned_to: null,
          })
          .eq('id', deviceAction.device_id);

        movements.push({
          device_id: deviceAction.device_id,
          movement_type: 'installation',
          from_status: device.status,
          to_status: 'installed',
          from_location: 'engineer',
          to_location: call.client_address,
          performed_by: user.id,
          call_id: call_id,
          notes: deviceAction.notes,
        });
      } else if (deviceAction.action === 'swap_in') {
        newStatus = 'installed';
        installedAt = call.client_address;
        await supabase
          .from('devices')
          .update({
            status: 'installed',
            installed_at_client: call.client_address,
            assigned_to: null,
          })
          .eq('id', deviceAction.device_id);

        movements.push({
          device_id: deviceAction.device_id,
          movement_type: 'swap_in',
          from_status: device.status,
          to_status: 'installed',
          from_location: 'engineer',
          to_location: call.client_address,
          performed_by: user.id,
          call_id: call_id,
          notes: deviceAction.notes,
        });
      }

      devicesProcessed.push({
        device_id: deviceAction.device_id,
        serial_number: deviceAction.serial_number,
        action: deviceAction.action,
        new_status: newStatus,
        installed_at_client: installedAt,
      });

      await supabase
        .from('call_devices')
        .insert({
          call_id,
          device_id: deviceAction.device_id,
          action: deviceAction.action,
        });
    }

    if (movements.length > 0) {
      await supabase.from('stock_movements').insert(movements);
    }

    await supabase.rpc('update_engineer_aggregates', {
      p_engineer_id: call.assigned_engineer,
    });

    const response = {
      success: true,
      message: `Call ${call.call_number} completed successfully`,
      call: {
        id: call.id,
        call_number: call.call_number,
        status: 'completed',
        completed_at: completion_timestamp,
        actual_duration_minutes,
      },
      devices_processed: devicesProcessed,
      stock_movements_created: movements.length,
      alerts_created: [],
      engineer_stats_updated: { total_calls_completed: 'updated' },
    };

    await supabase.rpc('store_idempotency_key', {
      p_key: idemKey,
      p_operation: 'submit_call_completion',
      p_response: response,
      p_user_id: user.id,
      p_ttl_seconds: 60,
    });

    logStructured('info', 'submit-call-completion', {
      call_id,
      devices: devicesProcessed.length,
      duration_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('submit-call-completion error:', error);
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
