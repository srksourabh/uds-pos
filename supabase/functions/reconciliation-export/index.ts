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

    const { bankId = null, startDate = null, endDate = null, includeMovements = false } = await req.json();

    let query = supabase
      .from('devices')
      .select(`
        id,
        serial_number,
        model,
        status,
        bank:device_bank(id, name, code),
        assigned_engineer:assigned_to(id, full_name),
        installed_at_client,
        installation_date,
        warranty_expiry,
        last_maintenance_date,
        created_at,
        updated_at
      `);

    if (bankId) {
      query = query.eq('device_bank', bankId);
    }

    if (startDate) {
      query = query.gte('updated_at', startDate);
    }

    if (endDate) {
      query = query.lte('updated_at', endDate);
    }

    const { data: devices, error: devicesError } = await query.order('serial_number');

    if (devicesError) {
      return new Response(JSON.stringify({ error: devicesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let movementsData: any[] = [];
    if (includeMovements) {
      const deviceIds = devices?.map(d => d.id) || [];
      if (deviceIds.length > 0) {
        const { data: movements } = await supabase
          .from('stock_movements')
          .select(`
            *,
            device:device_id(serial_number),
            from_eng:from_engineer(full_name),
            to_eng:to_engineer(full_name),
            actor:actor_id(full_name)
          `)
          .in('device_id', deviceIds)
          .order('created_at', { ascending: false })
          .limit(1000);

        movementsData = movements || [];
      }
    }

    const csvRows: string[] = [];
    csvRows.push('Serial Number,Model,Bank Code,Bank Name,Status,Assigned To,Installed At,Installation Date,Warranty Expiry,Last Maintenance,Days Since Update,Created At,Updated At');

    for (const device of devices || []) {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(device.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      csvRows.push([
        device.serial_number,
        device.model,
        device.bank?.code || '',
        device.bank?.name || '',
        device.status,
        device.assigned_engineer?.full_name || '',
        device.installed_at_client || '',
        device.installation_date || '',
        device.warranty_expiry || '',
        device.last_maintenance_date || '',
        daysSinceUpdate.toString(),
        device.created_at,
        device.updated_at,
      ].map(field => `"${field}"`).join(','));
    }

    const csvContent = csvRows.join('\n');

    let movementsCsv = '';
    if (includeMovements && movementsData.length > 0) {
      const movementRows: string[] = [];
      movementRows.push('Device Serial,Movement Type,From Status,To Status,From Engineer,To Engineer,Actor,Reason,Notes,Created At');
      
      for (const movement of movementsData) {
        movementRows.push([
          movement.device?.serial_number || '',
          movement.movement_type,
          movement.from_status,
          movement.to_status,
          movement.from_eng?.full_name || movement.from_location || '',
          movement.to_eng?.full_name || movement.to_location || '',
          movement.actor?.full_name || '',
          movement.reason,
          movement.notes || '',
          movement.created_at,
        ].map(field => `"${field}"`).join(','));
      }
      movementsCsv = movementRows.join('\n');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `reconciliation_${timestamp}.csv`;

    return new Response(JSON.stringify({
      success: true,
      filename: filename,
      devicesCsv: csvContent,
      movementsCsv: movementsCsv,
      deviceCount: devices?.length || 0,
      movementCount: movementsData.length,
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