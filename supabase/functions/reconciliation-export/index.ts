import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return errorResponse('Admin role required', 'FORBIDDEN', 403);
    }

    const url = new URL(req.url);
    const bankId = url.searchParams.get('bankId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const includeMovements = url.searchParams.get('includeMovements') === 'true';

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return errorResponse('Start date must be before end date', 'INVALID_DATE_RANGE', 400);
    }

    let devicesQuery = supabase
      .from('devices')
      .select('*, banks(bank_code, bank_name)');

    if (bankId) {
      devicesQuery = devicesQuery.eq('device_bank', bankId);
    }

    const { data: devices, error: devicesError } = await devicesQuery;

    if (devicesError) {
      console.error('Devices query error:', devicesError);
      return errorResponse('Failed to fetch devices', 'INTERNAL_SERVER_ERROR', 500);
    }

    if (!devices || devices.length > 100000) {
      return errorResponse('Export too large (>100K rows)', 'EXPORT_TOO_LARGE', 413);
    }

    const statusCounts: Record<string, number> = {};
    const bankCounts: Record<string, number> = {};

    devices.forEach(device => {
      statusCounts[device.status] = (statusCounts[device.status] || 0) + 1;
      const bankCode = device.banks?.bank_code || 'unknown';
      bankCounts[bankCode] = (bankCounts[bankCode] || 0) + 1;
    });

    const devicesCsvHeader = 'serial_number,model,status,bank_code,assigned_to,installed_at,last_updated\n';
    const devicesCsvRows = devices.map(d => 
      `"${d.serial_number}","${d.model}","${d.status}","${d.banks?.bank_code || ''}","${d.assigned_to || ''}","${d.installed_at_client || ''}","${d.updated_at}"`
    ).join('\n');
    const devicesCsv = devicesCsvHeader + devicesCsvRows;

    let movementsCsv = '';
    let movementCount = 0;

    if (includeMovements) {
      let movementsQuery = supabase
        .from('stock_movements')
        .select('*, devices(serial_number)')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (startDate) {
        movementsQuery = movementsQuery.gte('created_at', startDate);
      }

      if (endDate) {
        movementsQuery = movementsQuery.lte('created_at', endDate);
      }

      const { data: movements } = await movementsQuery;

      if (movements && movements.length > 0) {
        movementCount = movements.length;
        const movementsCsvHeader = 'device_serial,movement_type,from_status,to_status,from_location,to_location,performed_by,created_at,notes\n';
        const movementsCsvRows = movements.map(m => 
          `"${m.devices?.serial_number || ''}","${m.movement_type}","${m.from_status}","${m.to_status}","${m.from_location}","${m.to_location}","${m.performed_by}","${m.created_at}","${m.notes || ''}"`
        ).join('\n');
        movementsCsv = movementsCsvHeader + movementsCsvRows;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `reconciliation-${timestamp}.csv`;

    logStructured('info', 'reconciliation-export', {
      device_count: devices.length,
      movement_count: movementCount,
      bank_id: bankId,
      duration_ms: Date.now() - startTime,
    });

    const response = {
      success: true,
      filename,
      devicesCsv,
      movementsCsv: movementsCsv || undefined,
      deviceCount: devices.length,
      movementCount,
      summary: {
        total_devices: devices.length,
        by_status: statusCounts,
        by_bank: bankCounts,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('reconciliation-export error:', error);
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
