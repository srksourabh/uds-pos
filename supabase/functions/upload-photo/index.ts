import { createClient } from 'npm:@supabase/supabase-js@2';
import { createError, AppError } from '../_shared/errors.ts';
import { emitEvent, logStructured } from '../_shared/monitoring.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MAX_FILE_SIZE = 10485760;
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];

interface PhotoMetadata {
  device_id: string;
  call_id?: string;
  photo_type: 'before' | 'after' | 'damage' | 'serial_number' | 'installation';
  caption?: string;
  gps?: { latitude: number; longitude: number; accuracy?: number; };
  photo_info?: { width?: number; height?: number; captured_at?: string; };
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw createError('UNAUTHORIZED', 'Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw createError('UNAUTHORIZED', 'Invalid or expired token');

    logStructured('info', 'upload-photo', 'function_start', { duration_ms: Date.now() - startTime }, requestId, user.id);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;

    if (!file) throw createError('VALIDATION_ERROR', 'No file provided');
    if (!metadataStr) throw createError('VALIDATION_ERROR', 'No metadata provided');

    const metadata: PhotoMetadata = JSON.parse(metadataStr);
    const { device_id, call_id, photo_type, caption, gps, photo_info } = metadata;

    if (!device_id || !photo_type) throw createError('VALIDATION_ERROR', 'Missing required fields: device_id, photo_type');
    if (file.size > MAX_FILE_SIZE) throw createError('VALIDATION_ERROR', `File size exceeds 10MB`);
    if (!ALLOWED_TYPES.includes(file.type)) throw createError('VALIDATION_ERROR', `File type not allowed`);

    if (photo_info?.width && photo_info?.height) {
      if (photo_info.width < MIN_WIDTH || photo_info.height < MIN_HEIGHT) {
        throw createError('VALIDATION_ERROR', `Image resolution below minimum`);
      }
    }

    if (gps) {
      if (gps.latitude < -90 || gps.latitude > 90) throw createError('VALIDATION_ERROR', 'Invalid GPS latitude');
      if (gps.longitude < -180 || gps.longitude > 180) throw createError('VALIDATION_ERROR', 'Invalid GPS longitude');
    }

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, device_bank, assigned_to')
      .eq('id', device_id)
      .maybeSingle();

    if (deviceError || !device) throw createError('DEVICE_NOT_FOUND', `Device not found`);

    if (call_id) {
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('id, assigned_engineer, client_bank')
        .eq('id', call_id)
        .maybeSingle();

      if (callError || !call) throw createError('CALL_NOT_FOUND', `Call not found`);
      if (call.assigned_engineer !== user.id) throw createError('CALL_NOT_ASSIGNED_TO_YOU', 'Call not assigned to you');
      if (call.client_bank !== device.device_bank) throw createError('DEVICE_BANK_MISMATCH', 'Device bank mismatch');
    } else {
      if (device.assigned_to !== user.id) throw createError('DEVICE_NOT_ASSIGNED_TO_YOU', 'Device not assigned to you');
    }

    const photoId = crypto.randomUUID();
    const fileExt = file.type.includes('jpeg') ? 'jpg' : file.type.includes('png') ? 'png' : 'heic';
    const storagePath = call_id ? `${call_id}/${photoId}_${photo_type}.${fileExt}` : `device-${device_id}/${photoId}_${photo_type}.${fileExt}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('call-photos')
      .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false });

    if (uploadError) throw createError('INTERNAL_SERVER_ERROR', `Failed to upload: ${uploadError.message}`);

    const { data: photoRecord, error: dbError } = await supabase
      .from('photos')
      .insert({
        id: photoId,
        device_id,
        call_id: call_id || null,
        uploaded_by: user.id,
        photo_type,
        storage_path: storagePath,
        caption: caption || null,
        file_size_bytes: file.size,
        image_width: photo_info?.width || null,
        image_height: photo_info?.height || null,
        mime_type: file.type,
        gps_latitude: gps?.latitude || null,
        gps_longitude: gps?.longitude || null,
        gps_accuracy: gps?.accuracy || null,
        captured_at: photo_info?.captured_at || new Date().toISOString(),
        validation_status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from('call-photos').remove([storagePath]);
      throw createError('INTERNAL_SERVER_ERROR', `Failed to create photo record: ${dbError.message}`);
    }

    const { data: signedUrlData } = await supabase.storage.from('call-photos').createSignedUrl(storagePath, 3600);

    const response = {
      success: true,
      message: 'Photo uploaded successfully',
      photo: {
        id: photoId,
        storage_path: storagePath,
        signed_url: signedUrlData?.signedUrl,
        photo_type,
        file_size_bytes: file.size,
        uploaded_at: photoRecord.created_at,
        has_gps: !!gps,
        validation_status: 'pending',
      },
    };

    await emitEvent(supabase, {
      event_type: 'photo',
      event_name: 'photo_uploaded',
      user_id: user.id,
      entity_type: 'photo',
      entity_id: photoId,
      metadata: { device_id, call_id, photo_type, file_size: file.size, has_gps: !!gps },
      severity: 'info',
    });

    logStructured('info', 'upload-photo', 'photo_uploaded', {
      photo_id: photoId,
      photo_type,
      file_size: file.size,
      duration_ms: Date.now() - startTime,
    }, requestId, user.id);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    if (error instanceof AppError) {
      logStructured('warn', 'upload-photo', 'app_error', {
        error_code: error.code,
        error_message: error.message,
        duration_ms: Date.now() - startTime,
      }, requestId);

      return new Response(JSON.stringify(error.toJSON()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.statusCode,
      });
    }

    logStructured('error', 'upload-photo', 'unexpected_error', {
      error_message: error.message,
      duration_ms: Date.now() - startTime,
    }, requestId);

    const internalError = createError('INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
    return new Response(JSON.stringify(internalError.toJSON()), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
