import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WebhookPayload {
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

    if (!n8nWebhookUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'N8N_WEBHOOK_URL not configured',
          warning: 'Set the N8N_WEBHOOK_URL environment variable in Supabase'
        }),
        {
          status: 200, // Return 200 to avoid retries
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json();
    const {
      endpoint,
      event_type,
      data,
      metadata = {},
    } = body;

    if (!endpoint || !event_type) {
      return new Response(
        JSON.stringify({ error: 'endpoint and event_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = `${n8nWebhookUrl}/${endpoint}`;
    const payload: WebhookPayload = {
      event_type,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        ...metadata,
        source: 'uds-pos-edge-function',
        environment: Deno.env.get('ENVIRONMENT') || 'production',
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook failed: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Webhook returned ${response.status}`,
          details: errorText,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await response.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        success: true,
        webhook_url: webhookUrl,
        response: responseData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook trigger error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to trigger webhook',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
