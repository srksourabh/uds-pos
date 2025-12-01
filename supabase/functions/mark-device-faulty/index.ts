import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MarkFaultyRequest {
  deviceId: string;
  faultDescription: string;
  faultCategory: 'Hardware' | 'Software' | 'Physical Damage' | 'Other';
  severity: 'minor' | 'major' | 'critical';
  requiresRepair?: boolean;
  estimatedCost?: number;
  createSwapCall?: boolean;
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
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'engineer')) {
      return errorResponse('Insufficient permissions', 'FORBIDDEN', 403);
    }

    const body = await req.json() as MarkFaultyRequest;
    const {
      deviceId,
      faultDescription,
      faultCategory,
      severity,
      requiresRepair = true,
      estimatedCost,
      createSwapCall = false,
    } = body;

    if (!deviceId || !faultDescription || !faultCategory || !severity) {
      return errorResponse('Missing required fields', 'MISSING_REQUIRED_FIELDS', 400);
    }

    if (faultDescription.length < 20) {
      return errorResponse('Fault description must be at least 20 characters', 'FAULT_DESCRIPTION_TOO_SHORT', 400);
    }

    if (estimatedCost !== undefined && estimatedCost < 0) {
      return errorResponse('Estimated cost cannot be negative', 'INVALID_ESTIMATED_COST', 400);
    }

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*, banks(bank_name, bank_code)')
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      return errorResponse(`Device with ID ${deviceId} not found`, 'DEVICE_NOT_FOUND', 404);
    }

    if (device.status === 'faulty') {
      return errorResponse('Device is already marked as faulty', 'DEVICE_ALREADY_FAULTY', 409);
    }

    if (profile.role === 'engineer' && device.assigned_to !== user.id) {
      return errorResponse('You can only mark your own devices as faulty', 'DEVICE_NOT_ASSIGNED_TO_YOU', 403);
    }

    if (profile.role === 'engineer' && device.device_bank !== profile.bank_id) {
      return errorResponse('Device bank does not match your bank', 'DEVICE_BANK_MISMATCH', 400);
    }

    const previousStatus = device.status;
    const { error: updateError } = await supabase
      .from('devices')
      .update({
        status: 'faulty',
        fault_description: faultDescription,
        fault_category: faultCategory,
        fault_severity: severity,
        requires_repair: requiresRepair,
        estimated_repair_cost: estimatedCost,
        marked_faulty_at: new Date().toISOString(),
        marked_faulty_by: user.id,
      })
      .eq('id', deviceId);

    if (updateError) {
      console.error('Device update error:', updateError);
      return errorResponse('Failed to mark device as faulty', 'INTERNAL_SERVER_ERROR', 500);
    }

    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        device_id: deviceId,
        movement_type: 'marked_faulty',
        from_status: previousStatus,
        to_status: 'faulty',
        from_location: device.assigned_to ? 'engineer' : 'warehouse',
        to_location: 'faulty_stock',
        performed_by: user.id,
        notes: faultDescription,
      });

    if (movementError) {
      console.error('Stock movement error:', movementError);
    }

    const { data: alertData, error: alertError } = await supabase
      .from('stock_alerts')
      .insert({
        alert_type: 'device_faulty',
        entity_type: 'device',
        entity_id: deviceId,
        severity: severity === 'critical' ? 'high' : severity === 'major' ? 'medium' : 'low',
        title: `Device Marked Faulty: ${device.serial_number}`,
        message: `${device.serial_number} marked as faulty: ${faultDescription}`,
        metadata: {
          fault_category: faultCategory,
          severity,
          requires_repair: requiresRepair,
          estimated_cost: estimatedCost,
        },
      })
      .select('id')
      .single();

    let swapCallId = null;
    if (createSwapCall && device.status === 'installed') {
    }

    logStructured('info', 'mark-device-faulty', {
      device_id: deviceId,
      severity,
      user_id: user.id,
      duration_ms: Date.now() - startTime,
    });

    const response = {
      success: true,
      message: `Device ${device.serial_number} marked as faulty`,
      deviceId,
      swapCallId,
      alert_id: alertData?.id || null,
      device: {
        id: device.id,
        serial_number: device.serial_number,
        previous_status: previousStatus,
        new_status: 'faulty',
        fault_category: faultCategory,
        severity,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('mark-device-faulty error:', error);
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
