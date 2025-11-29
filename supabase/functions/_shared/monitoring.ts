import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface MonitoringEvent {
  event_type: string;
  event_name: string;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
}

export async function emitEvent(
  supabase: SupabaseClient,
  event: MonitoringEvent
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('emit_monitoring_event', {
      p_event_type: event.event_type,
      p_event_name: event.event_name,
      p_user_id: event.user_id || null,
      p_entity_type: event.entity_type || null,
      p_entity_id: event.entity_id || null,
      p_metadata: event.metadata || {},
      p_severity: event.severity || 'info',
    });

    if (error) {
      console.error('Failed to emit monitoring event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error emitting monitoring event:', error);
    return null;
  }
}

export function logStructured(
  level: 'info' | 'warn' | 'error',
  functionName: string,
  event: string,
  payload: Record<string, any>,
  requestId?: string,
  userId?: string
): void {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    function: functionName,
    request_id: requestId,
    user_id: userId,
    event,
    ...payload,
  };

  console.log(JSON.stringify(log));
}
