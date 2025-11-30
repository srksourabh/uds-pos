import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_WEIGHTS = {
  proximity: 0.35,
  priority: 0.25,
  workload: 0.20,
  stock: 0.20,
};

const PRIORITY_VALUES = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
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

    const body = await req.json();
    const {
      call_ids,
      weight_overrides,
      dry_run = false,
      actor_id = user.id,
      force_reassign = false,
    } = body;

    if (!call_ids || !Array.isArray(call_ids) || call_ids.length === 0 || call_ids.length > 100) {
      return errorResponse('call_ids must be array with 1-100 items', 'INVALID_CALL_IDS', 400);
    }

    const weights = { ...DEFAULT_WEIGHTS, ...weight_overrides };
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      return errorResponse(`Weights must sum to 1.0, got ${weightSum}`, 'INVALID_WEIGHTS', 400);
    }

    const statusFilter = force_reassign ? ['pending', 'assigned'] : ['pending'];
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*, banks(bank_name, bank_code)')
      .in('id', call_ids)
      .in('status', statusFilter);

    if (callsError) {
      return errorResponse('Failed to fetch calls', 'INTERNAL_SERVER_ERROR', 500);
    }

    const { data: engineers, error: engError } = await supabase
      .from('user_profiles')
      .select('*, banks(bank_name, bank_code), engineer_aggregates(*)')
      .eq('role', 'engineer')
      .eq('is_active', true);

    if (engError) {
      return errorResponse('Failed to fetch engineers', 'INTERNAL_SERVER_ERROR', 500);
    }

    const assignments: any[] = [];
    const unassigned: any[] = [];
    const engineerUtilization = new Set<string>();

    for (const call of calls) {
      const eligible = engineers.filter(eng => eng.bank_id === call.client_bank && eng.is_active);

      if (eligible.length === 0) {
        unassigned.push({
          call_id: call.id,
          call_number: call.call_number,
          reason: 'no_eligible_engineers',
          details: `No engineers available for bank ${call.banks?.bank_code}`,
          eligible_count: 0,
          considered_count: engineers.length,
        });
        continue;
      }

      const scored = eligible.map(engineer => {
        const distance = calculateDistance(
          engineer.latitude,
          engineer.longitude,
          call.latitude,
          call.longitude
        );

        const proximityScore = distance !== null
          ? Math.max(0, (1 - distance / 100)) * 100
          : 50;

        const priorityValue = PRIORITY_VALUES[call.priority as keyof typeof PRIORITY_VALUES] || 1;
        const priorityScore = (priorityValue / 4) * 100;

        const workload = engineer.engineer_aggregates?.[0]?.active_calls_count || 0;
        const workloadScore = Math.max(0, (1 - workload / 10)) * 100;

        const stock = engineer.engineer_aggregates?.[0]?.current_device_count || 0;
        const stockScore = Math.min(stock / 10, 1) * 100;

        const totalScore = (
          proximityScore * weights.proximity +
          priorityScore * weights.priority +
          workloadScore * weights.workload +
          stockScore * weights.stock
        );

        return {
          engineer,
          proximityScore,
          priorityScore,
          workloadScore,
          stockScore,
          totalScore,
          distance,
        };
      });

      const ranked = scored.sort((a, b) => b.totalScore - a.totalScore);
      const best = ranked[0];

      if (!dry_run) {
        const { error: updateError } = await supabase
          .from('calls')
          .update({
            status: 'assigned',
            assigned_engineer: best.engineer.user_id,
            assigned_at: new Date().toISOString(),
            assigned_by: actor_id,
          })
          .eq('id', call.id);

        if (updateError) {
          unassigned.push({
            call_id: call.id,
            call_number: call.call_number,
            reason: 'update_failed',
            details: updateError.message,
            eligible_count: eligible.length,
            considered_count: eligible.length,
          });
          continue;
        }
      }

      engineerUtilization.add(best.engineer.user_id);
      assignments.push({
        call_id: call.id,
        call_number: call.call_number,
        assigned_engineer_id: best.engineer.user_id,
        engineer_name: best.engineer.full_name,
        score: best.totalScore,
        score_breakdown: {
          proximity_score: best.proximityScore,
          priority_score: best.priorityScore,
          workload_score: best.workloadScore,
          stock_score: best.stockScore,
        },
        distance_km: best.distance || 0,
        stock_available: best.engineer.engineer_aggregates?.[0]?.current_device_count || 0,
        reason: `Best match with score ${best.totalScore.toFixed(2)}`,
        assigned_at: new Date().toISOString(),
      });
    }

    const avgScore = assignments.length > 0
      ? assignments.reduce((sum, a) => sum + a.score, 0) / assignments.length
      : 0;

    const avgDistance = assignments.length > 0
      ? assignments.reduce((sum, a) => sum + a.distance_km, 0) / assignments.length
      : 0;

    logStructured('info', 'assign-calls', {
      assigned: assignments.length,
      unassigned: unassigned.length,
      duration_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify({
      success: true,
      assignments,
      unassigned,
      statistics: {
        total_calls: call_ids.length,
        assigned_count: assignments.length,
        unassigned_count: unassigned.length,
        avg_score: avgScore,
        avg_distance_km: avgDistance,
        execution_time_ms: Date.now() - startTime,
        engineers_utilized: engineerUtilization.size,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('assign-calls error:', error);
    return errorResponse(error.message, 'INTERNAL_SERVER_ERROR', 500);
  }
});

function calculateDistance(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

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
