import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ScanDeviceRequest {
  call_id: string;
  serial_number: string;
  scan_timestamp: string;
  scan_gps?: {
    latitude: number;
    longitude: number;
  };
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

    const body = await req.json() as ScanDeviceRequest;
    const { call_id, serial_number } = body;

    if (!call_id || !serial_number) {
      throw new Error('call_id and serial_number are required');
    }

    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, client_bank:banks!calls_client_bank_fkey(id, name, code)')
      .eq('id', call_id)
      .single();

    if (callError || !call) {
      throw new Error('Call not found');
    }

    if (call.assigned_engineer !== user.id) {
      throw new Error('Call not assigned to you');
    }

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*, device_bank:banks!devices_device_bank_fkey(id, name, code)')
      .eq('serial_number', serial_number)
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'DEVICE_NOT_FOUND',
          error_message: 'Device not found in database. Check serial number.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const bankMatch = device.device_bank === call.client_bank;

    if (!bankMatch) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'BANK_MISMATCH',
          error_message: 'Device bank does not match call bank',
          device: {
            device_bank: device.device_bank,
            device_bank_name: device.device_bank?.name || 'Unknown',
            device_bank_code: device.device_bank?.code || 'Unknown',
          },
          call: {
            client_bank: call.client_bank,
            client_bank_name: call.client_bank?.name || 'Unknown',
            client_bank_code: call.client_bank?.code || 'Unknown',
          },
          bank_match: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (device.assigned_to !== user.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'DEVICE_NOT_ASSIGNED',
          error_message: 'Device not assigned to you. Contact admin.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    if (!['warehouse', 'issued'].includes(device.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'DEVICE_STATUS_INVALID',
          error_message: `Device status is ${device.status}. Cannot use for this call.`,
          device_status: device.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        device: {
          id: device.id,
          serial_number: device.serial_number,
          model: device.model,
          device_bank: device.device_bank,
          bank_name: device.device_bank?.name || 'Unknown',
          bank_code: device.device_bank?.code || 'Unknown',
          status: device.status,
          assigned_to: device.assigned_to,
          bank_match: true,
        },
        message: 'Device validated successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Scan device error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});