import { createClient } from 'npm:@supabase/supabase-js@2';
import { createError, AppError } from '../_shared/errors.ts';
import { emitEvent, logStructured } from '../_shared/monitoring.ts';
import { generateIdempotencyKey, checkIdempotencyKey, storeIdempotencyKey } from '../_shared/idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SubmitCallCompletionRequest {
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
  metadata?: any;
  idempotency_key?: string;
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw createError('UNAUTHORIZED', 'Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw createError('UNAUTHORIZED', 'Invalid or expired token');
    }

    logStructured('info', 'submit-call-completion', 'function_start', {
      duration_ms: Date.now() - startTime,
    }, requestId, user.id);

    const body = await req.json() as SubmitCallCompletionRequest;
    const {
      call_id,
      resolution_notes,
      actual_duration_minutes,
      completion_timestamp,
      completion_gps,
      merchant_rating,
      devices = [],
      photo_urls = [],
      idempotency_key,
    } = body;

    // Validation
    if (!call_id || !resolution_notes || !actual_duration_minutes || !completion_timestamp) {
      throw createError('VALIDATION_ERROR', 'Missing required fields: call_id, resolution_notes, actual_duration_minutes, completion_timestamp');
    }

    if (resolution_notes.length < 20) {
      throw createError('RESOLUTION_NOTES_TOO_SHORT', 'Resolution notes must be at least 20 characters');
    }

    if (actual_duration_minutes < 1 || actual_duration_minutes > 1440) {
      throw createError('VALIDATION_ERROR', 'Actual duration must be between 1 and 1440 minutes');
    }

    if (merchant_rating && (merchant_rating < 1 || merchant_rating > 5)) {
      throw createError('VALIDATION_ERROR', 'Merchant rating must be between 1 and 5');
    }

    // Check idempotency
    const idemKey = idempotency_key || generateIdempotencyKey('submit-call-completion', {
      call_id,
      completion_timestamp,
    });

    const cachedResponse = await checkIdempotencyKey(supabase, idemKey, 'submit-call-completion', user.id, 60);
    if (cachedResponse) {
      logStructured('info', 'submit-call-completion', 'idempotent_response', {
        call_id,
        cached: true,
      }, requestId, user.id);

      return new Response(JSON.stringify(cachedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Fetch call with FOR UPDATE to prevent concurrent completions
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .maybeSingle();

    if (callError || !call) {
      throw createError('CALL_NOT_FOUND', `Call with ID ${call_id} not found`);
    }

    if (call.assigned_engineer !== user.id) {
      throw createError('CALL_NOT_ASSIGNED_TO_YOU', 'This call is not assigned to you');
    }

    if (call.status === 'completed') {
      throw createError('INVALID_CALL_STATUS', 'Call is already completed', {
        current_status: 'completed',
        completed_at: call.completed_at,
      });
    }

    if (call.status !== 'in_progress') {
      throw createError('INVALID_CALL_STATUS', `Call status is ${call.status}, expected 'in_progress'`, {
        current_status: call.status,
      });
    }

    // Validate devices
    if (['install', 'swap'].includes(call.type) && devices.length === 0) {
      throw createError('NO_DEVICES_PROVIDED', 'At least one device required for install/swap calls');
    }

    if (call.requires_photo && (!photo_urls || photo_urls.length === 0)) {
      throw createError('PHOTO_REQUIRED', 'Photo is required for this call');
    }

    // Validate device ownership and bank matching
    for (const device of devices) {
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .select('id, serial_number, device_bank, status, assigned_to')
        .eq('id', device.device_id)
        .maybeSingle();

      if (deviceError || !deviceData) {
        throw createError('DEVICE_NOT_FOUND', `Device ${device.serial_number} not found`);
      }

      if (deviceData.device_bank !== call.client_bank) {
        throw createError('DEVICE_BANK_MISMATCH', `Device ${device.serial_number} bank does not match call bank`);
      }

      if (deviceData.assigned_to !== user.id && !['installed', 'warehouse'].includes(deviceData.status)) {
        throw createError('DEVICE_NOT_ASSIGNED_TO_YOU', `Device ${device.serial_number} is not assigned to you`);
      }
    }

    // Build metadata
    const metadata = { ...(call.metadata || {}) };
    if (completion_gps) {
      metadata.completion_gps = completion_gps;
    }
    if (merchant_rating) {
      metadata.merchant_rating = merchant_rating;
    }
    if (photo_urls.length > 0) {
      metadata.photo_urls = photo_urls;
    }

    // Update call to completed
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'completed',
        completed_at: completion_timestamp,
        resolution_notes,
        actual_duration_minutes,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', call_id)
      .eq('status', 'in_progress');

    if (updateError) {
      if (updateError.message.includes('lock') || updateError.message.includes('concurrent')) {
        throw createError('CONCURRENT_COMPLETION', 'This call is currently being completed by another request', null, 2);
      }
      throw updateError;
    }

    const devicesProcessed = [];
    let stockMovementsCreated = 0;

    // Process each device
    for (const device of devices) {
      let newStatus = device.action === 'inspect' ? 'issued' : device.action.includes('in') || device.action === 'install' ? 'installed' : 'returned';

      const { error: deviceUpdateError } = await supabase
        .from('devices')
        .update({
          status: newStatus,
          installed_at_client: newStatus === 'installed' ? call.client_name : null,
          installation_date: newStatus === 'installed' ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', device.device_id);

      if (deviceUpdateError) {
        console.error(`Failed to update device ${device.serial_number}:`, deviceUpdateError);
      }

      // Create call_devices link
      await supabase.from('call_devices').insert({
        call_id,
        device_id: device.device_id,
        action: device.action,
      });

      // Create stock movement
      if (device.action !== 'inspect') {
        const { error: movementError } = await supabase.from('stock_movements').insert({
          device_id: device.device_id,
          movement_type: 'status_change',
          from_status: 'issued',
          to_status: newStatus,
          to_engineer: newStatus === 'installed' ? null : user.id,
          to_location: newStatus === 'installed' ? call.client_address : null,
          call_id,
          actor_id: user.id,
          reason: `Device ${device.action} for call ${call.call_number}`,
          notes: device.notes,
        });

        if (!movementError) {
          stockMovementsCreated++;
        }
      }

      devicesProcessed.push({
        device_id: device.device_id,
        serial_number: device.serial_number,
        action: device.action,
        new_status: newStatus,
        installed_at_client: newStatus === 'installed' ? call.client_name : undefined,
      });
    }

    // Create call history
    await supabase.from('call_history').insert({
      call_id,
      from_status: 'in_progress',
      to_status: 'completed',
      actor_id: user.id,
      notes: `Call completed by ${user.email}`,
    });

    // Update engineer aggregates
    await supabase.rpc('increment_engineer_completed_calls', {
      p_engineer_id: user.id,
      p_duration_minutes: actual_duration_minutes,
    }).catch(err => console.error('Failed to update engineer aggregates:', err));

    // Check for low stock alerts
    const { data: warehouseCount } = await supabase
      .from('devices')
      .select('id', { count: 'exact', head: true })
      .eq('device_bank', call.client_bank)
      .eq('status', 'warehouse');

    const alertsCreated = [];
    if (warehouseCount && warehouseCount < 5) {
      const { data: alertId } = await supabase.rpc('emit_monitoring_event', {
        p_event_type: 'alert',
        p_event_name: 'low_stock_detected',
        p_user_id: user.id,
        p_entity_type: 'bank',
        p_entity_id: call.client_bank,
        p_metadata: {
          current_warehouse_stock: warehouseCount,
          threshold: 5,
          triggered_by_call: call.call_number,
        },
        p_severity: warehouseCount < 3 ? 'critical' : 'warning',
      });
      if (alertId) {
        alertsCreated.push({
          alert_id: alertId,
          alert_type: 'low_stock',
          severity: warehouseCount < 3 ? 'critical' : 'warning',
        });
      }
    }

    const response = {
      success: true,
      message: 'Call completed successfully',
      call: {
        id: call.id,
        call_number: call.call_number,
        status: 'completed',
        completed_at: completion_timestamp,
        actual_duration_minutes,
      },
      devices_processed: devicesProcessed,
      stock_movements_created: stockMovementsCreated,
      alerts_created: alertsCreated,
      engineer_stats_updated: {
        total_calls_completed: 'incremented',
      },
    };

    // Store in idempotency cache
    await storeIdempotencyKey(supabase, idemKey, 'submit-call-completion', response, user.id, 60);

    // Emit monitoring event
    const onTime = new Date(completion_timestamp) <= new Date(call.scheduled_date);
    await emitEvent(supabase, {
      event_type: 'call',
      event_name: 'call_completed',
      user_id: user.id,
      entity_type: 'call',
      entity_id: call.id,
      metadata: {
        call_number: call.call_number,
        call_type: call.type,
        actual_duration_minutes,
        devices_installed: devicesProcessed.filter(d => d.action.includes('install')).length,
        devices_removed: devicesProcessed.filter(d => d.action.includes('remove') || d.action.includes('out')).length,
        on_time: onTime,
        merchant_rating,
      },
      severity: 'info',
    });

    logStructured('info', 'submit-call-completion', 'call_completed', {
      call_id: call.id,
      call_number: call.call_number,
      devices_count: devices.length,
      duration_ms: Date.now() - startTime,
    }, requestId, user.id);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    if (error instanceof AppError) {
      logStructured('warn', 'submit-call-completion', 'app_error', {
        error_code: error.code,
        error_message: error.message,
        duration_ms: Date.now() - startTime,
      }, requestId);

      return new Response(JSON.stringify(error.toJSON()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.statusCode,
      });
    }

    logStructured('error', 'submit-call-completion', 'unexpected_error', {
      error_message: error.message,
      error_stack: error.stack,
      duration_ms: Date.now() - startTime,
    }, requestId);

    const internalError = createError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
    return new Response(JSON.stringify(internalError.toJSON()), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
