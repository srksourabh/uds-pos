/**
 * CORS Configuration for Supabase Edge Functions
 *
 * Supports environment-based origin whitelisting for production security.
 * Set ALLOWED_ORIGINS env variable with comma-separated list of allowed origins.
 *
 * Example: ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
 *
 * In development, if ALLOWED_ORIGINS is not set, defaults to '*' for convenience.
 */

function getAllowedOrigin(requestOrigin: string | null): string {
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');

  // If no origins configured, allow all (development mode)
  if (!allowedOriginsEnv) {
    console.warn('CORS: ALLOWED_ORIGINS not set, allowing all origins (not recommended for production)');
    return '*';
  }

  // Parse allowed origins
  const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim().toLowerCase());

  // Check if request origin is allowed
  if (requestOrigin && allowedOrigins.includes(requestOrigin.toLowerCase())) {
    return requestOrigin;
  }

  // Return first allowed origin as fallback (will cause CORS error for unauthorized origins)
  return allowedOrigins[0] || '*';
}

/**
 * Get CORS headers for a request
 * @param requestOrigin The Origin header from the request
 */
export function getCorsHeaders(requestOrigin: string | null = null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Request-Id',
    'Access-Control-Max-Age': '86400', // 24 hours preflight cache
  };
}

/**
 * Handle OPTIONS preflight request
 * @param requestOrigin The Origin header from the request
 */
export function handleCorsPreflightRequest(requestOrigin: string | null = null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(requestOrigin),
  });
}

/**
 * Default CORS headers for backward compatibility
 * NOTE: Prefer using getCorsHeaders(request.headers.get('origin')) for proper origin checking
 */
export const corsHeaders = getCorsHeaders(null);
