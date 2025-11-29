import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { createHash } from 'node:crypto';

export function generateIdempotencyKey(
  operation: string,
  params: Record<string, any>
): string {
  const data = JSON.stringify({ operation, ...params });
  return createHash('sha256').update(data).digest('hex');
}

export async function checkIdempotencyKey(
  supabase: SupabaseClient,
  key: string,
  operation: string,
  userId: string,
  ttlSeconds: number = 300
): Promise<any | null> {
  try {
    const { data, error } = await supabase.rpc('check_idempotency_key', {
      p_key: key,
      p_operation: operation,
      p_user_id: userId,
      p_ttl_seconds: ttlSeconds,
    });

    if (error) {
      console.error('Error checking idempotency key:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error checking idempotency key:', error);
    return null;
  }
}

export async function storeIdempotencyKey(
  supabase: SupabaseClient,
  key: string,
  operation: string,
  response: any,
  userId: string,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const { error } = await supabase.rpc('store_idempotency_key', {
      p_key: key,
      p_operation: operation,
      p_response: response,
      p_user_id: userId,
      p_ttl_seconds: ttlSeconds,
    });

    if (error) {
      console.error('Error storing idempotency key:', error);
    }
  } catch (error) {
    console.error('Error storing idempotency key:', error);
  }
}
