import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeviceImportRow {
  serial_number: string;
  model: string;
  device_bank_code: string;
  warranty_expiry?: string;
  firmware_version?: string;
  notes?: string;
}

interface ImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; error: string; data: DeviceImportRow }>;
  duplicates: string[];
}

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

    const { devices, skipDuplicates = true } = await req.json();

    if (!Array.isArray(devices) || devices.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request: devices array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (devices.length > 1000) {
      return new Response(JSON.stringify({ error: 'Maximum 1000 devices per import' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: ImportResult = {
      success: true,
      successCount: 0,
      errorCount: 0,
      errors: [],
      duplicates: [],
    };

    const { data: banks } = await supabase.from('banks').select('id, code');
    const bankMap = new Map(banks?.map(b => [b.code.toLowerCase(), b.id]) || []);

    const { data: existingDevices } = await supabase
      .from('devices')
      .select('serial_number');
    const existingSerials = new Set(existingDevices?.map(d => d.serial_number.toLowerCase()) || []);

    for (let i = 0; i < devices.length; i++) {
      const row = devices[i];
      const rowNum = i + 1;

      try {
        if (!row.serial_number || !row.model || !row.device_bank_code) {
          result.errors.push({
            row: rowNum,
            error: 'Missing required fields: serial_number, model, device_bank_code',
            data: row,
          });
          result.errorCount++;
          continue;
        }

        if (existingSerials.has(row.serial_number.toLowerCase())) {
          if (skipDuplicates) {
            result.duplicates.push(row.serial_number);
            continue;
          } else {
            result.errors.push({
              row: rowNum,
              error: `Duplicate serial number: ${row.serial_number}`,
              data: row,
            });
            result.errorCount++;
            continue;
          }
        }

        const bankId = bankMap.get(row.device_bank_code.toLowerCase());
        if (!bankId) {
          result.errors.push({
            row: rowNum,
            error: `Invalid bank code: ${row.device_bank_code}`,
            data: row,
          });
          result.errorCount++;
          continue;
        }

        const deviceData: any = {
          serial_number: row.serial_number.trim(),
          model: row.model.trim(),
          device_bank: bankId,
          status: 'warehouse',
          notes: row.notes?.trim() || '',
        };

        if (row.warranty_expiry) {
          const warrantyDate = new Date(row.warranty_expiry);
          if (!isNaN(warrantyDate.getTime())) {
            deviceData.warranty_expiry = warrantyDate.toISOString().split('T')[0];
          }
        }

        if (row.firmware_version) {
          deviceData.firmware_version = row.firmware_version.trim();
        }

        const { error: insertError } = await supabase
          .from('devices')
          .insert(deviceData);

        if (insertError) {
          result.errors.push({
            row: rowNum,
            error: insertError.message,
            data: row,
          });
          result.errorCount++;
        } else {
          result.successCount++;
        }
      } catch (error) {
        result.errors.push({
          row: rowNum,
          error: error.message,
          data: row,
        });
        result.errorCount++;
      }
    }

    result.success = result.errorCount === 0;

    return new Response(JSON.stringify(result), {
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