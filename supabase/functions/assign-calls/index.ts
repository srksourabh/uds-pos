import { createClient } from 'npm:@supabase/supabase-js@2';
import { calculateDistance } from './utils/geo.ts';
import { calculateScores, filterEligibleEngineers, rankEngineers } from './utils/scoring.ts';
import type { AssignCallsRequest, AssignCallsResponse, Engineer, Call, Assignment, UnassignedCall } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const DEFAULT_WEIGHTS = {
  proximity: 0.35,
  priority: 0.25,
  workload: 0.20,
  stock: 0.20,
};

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

    const body = await req.json() as AssignCallsRequest;
    const {
      call_ids,
      weight_overrides,
      dry_run = false,
      actor_id = user.id,
      force_reassign = false,
    } = body;

    if (!call_ids || !Array.isArray(call_ids) || call_ids.length === 0) {
      throw new Error('Invalid call_ids: must be non-empty array');
    }

    const weights = { ...DEFAULT_WEIGHTS, ...weight_overrides };
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      throw new Error(`Weights must sum to 1.0, got ${weightSum}`);
    }

    const result = await assignCalls({
      supabase,
      call_ids,
      weights,
      dry_run,
      actor_id,
      force_reassign,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Assignment error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

async function assignCalls(params: {
  supabase: any;
  call_ids: string[];
  weights: any;
  dry_run: boolean;
  actor_id: string;
  force_reassign: boolean;
}): Promise<AssignCallsResponse> {
  const startTime = Date.now();
  const { supabase, call_ids, weights, dry_run, actor_id, force_reassign } = params;

  const statusFilter = force_reassign ? ['pending', 'assigned'] : ['pending'];
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('*')
    .in('id', call_ids)
    .in('status', statusFilter);

  if (callsError) throw callsError;
  if (!calls || calls.length === 0) {
    throw new Error('No eligible calls found for given IDs');
  }

  const bankIds = [...new Set(calls.map((c: Call) => c.client_bank))];
  const { data: engineers, error: engineersError } = await supabase.rpc(
    'get_engineers_with_stock',
    { bank_ids: bankIds }
  );

  if (engineersError) throw engineersError;
  if (!engineers || engineers.length === 0) {
    return {
      success: true,
      assignments: [],
      unassigned: calls.map((call: Call) => ({
        call_id: call.id,
        call_number: call.call_number,
        reason: 'no_engineers_in_bank' as const,
        details: `No active engineers available for bank ${call.client_bank}`,
        eligible_count: 0,
        considered_count: 0,
      })),
      statistics: {
        total_calls: calls.length,
        assigned_count: 0,
        unassigned_count: calls.length,
        avg_score: 0,
        avg_distance_km: 0,
        execution_time_ms: Date.now() - startTime,
        engineers_utilized: 0,
      },
    };
  }

  calls.sort((a: Call, b: Call) => {
    const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const assignments: Assignment[] = [];
  const unassigned: UnassignedCall[] = [];
  const engineerWorkloads = new Map<string, number>();
  const engineerStocks = new Map<string, Map<string, number>>();

  engineers.forEach((eng: Engineer) => {
    engineerWorkloads.set(eng.id, Number(eng.active_calls_count));
    const stockMap = new Map<string, number>();
    if (eng.stock_count_by_bank) {
      Object.entries(eng.stock_count_by_bank).forEach(([bankId, count]) => {
        stockMap.set(bankId, count as number);
      });
    }
    engineerStocks.set(eng.id, stockMap);
  });

  for (const call of calls) {
    const eligible = filterEligibleEngineers(engineers, call, engineerStocks);

    if (eligible.length === 0) {
      unassigned.push({
        call_id: call.id,
        call_number: call.call_number,
        reason: determineUnassignedReason(engineers, call, engineerStocks),
        details: generateUnassignedDetails(engineers, call, engineerStocks),
        eligible_count: 0,
        considered_count: engineers.length,
      });
      continue;
    }

    const scored = eligible.map((engineer: Engineer) => ({
      engineer,
      scores: calculateScores(engineer, call, weights, engineerWorkloads),
    }));

    scored.sort((a, b) => rankEngineers(a, b, engineerStocks, call.client_bank));
    const winner = scored[0];

    if (!dry_run) {
      const { data: assignResult, error: assignError } = await supabase.rpc(
        'assign_call_to_engineer',
        {
          p_call_id: call.id,
          p_engineer_id: winner.engineer.id,
          p_actor_id: actor_id,
          p_reason: 'Auto-assigned via algorithm',
        }
      );

      if (assignError || !assignResult?.success) {
        unassigned.push({
          call_id: call.id,
          call_number: call.call_number,
          reason: 'validation_failed' as const,
          details: assignResult?.error || assignError?.message || 'Unknown error',
          eligible_count: eligible.length,
          considered_count: engineers.length,
        });
        continue;
      }
    }

    engineerWorkloads.set(winner.engineer.id, (engineerWorkloads.get(winner.engineer.id) || 0) + 1);
    const stockMap = engineerStocks.get(winner.engineer.id)!;
    if (call.type === 'install' || call.type === 'swap') {
      const currentStock = stockMap.get(call.client_bank) || 0;
      if (currentStock > 0) {
        stockMap.set(call.client_bank, currentStock - 1);
      }
    }

    assignments.push({
      call_id: call.id,
      call_number: call.call_number,
      assigned_engineer_id: winner.engineer.id,
      engineer_name: winner.engineer.full_name,
      score: winner.scores.final_score,
      score_breakdown: {
        proximity_score: winner.scores.proximity_score,
        priority_score: winner.scores.priority_score,
        workload_score: winner.scores.workload_score,
        stock_score: winner.scores.stock_score,
      },
      distance_km: winner.scores.distance_km,
      stock_available: stockMap.get(call.client_bank) || 0,
      reason: generateAssignmentReason(winner.scores),
      assigned_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    assignments,
    unassigned,
    statistics: {
      total_calls: calls.length,
      assigned_count: assignments.length,
      unassigned_count: unassigned.length,
      avg_score: assignments.length > 0
        ? assignments.reduce((sum, a) => sum + a.score, 0) / assignments.length
        : 0,
      avg_distance_km: assignments.length > 0
        ? assignments.reduce((sum, a) => sum + (a.distance_km || 0), 0) / assignments.length
        : 0,
      execution_time_ms: Date.now() - startTime,
      engineers_utilized: new Set(assignments.map(a => a.assigned_engineer_id)).size,
    },
  };
}

function determineUnassignedReason(
  engineers: Engineer[],
  call: Call,
  stockMap: Map<string, Map<string, number>>
): 'no_eligible_engineers' | 'no_stock' | 'no_engineers_in_bank' | 'validation_failed' {
  const bankEngineers = engineers.filter(e => e.bank_id === call.client_bank);
  if (bankEngineers.length === 0) return 'no_engineers_in_bank';

  const requiresDevice = call.type === 'install' || call.type === 'swap';
  if (requiresDevice) {
    const hasStock = bankEngineers.some(e => {
      const stocks = stockMap.get(e.id);
      return stocks && (stocks.get(call.client_bank) || 0) > 0;
    });
    if (!hasStock) return 'no_stock';
  }

  return 'no_eligible_engineers';
}

function generateUnassignedDetails(
  engineers: Engineer[],
  call: Call,
  stockMap: Map<string, Map<string, number>>
): string {
  const bankEngineers = engineers.filter(e => e.bank_id === call.client_bank);
  if (bankEngineers.length === 0) {
    return `No engineers available for bank ${call.client_bank}`;
  }

  const requiresDevice = call.type === 'install' || call.type === 'swap';
  if (requiresDevice) {
    const totalStock = bankEngineers.reduce((sum, e) => {
      const stocks = stockMap.get(e.id);
      return sum + (stocks?.get(call.client_bank) || 0);
    }, 0);
    if (totalStock === 0) {
      return `No devices available in stock for bank. ${bankEngineers.length} engineers available but all have 0 stock.`;
    }
  }

  return `${bankEngineers.length} engineers considered but none eligible`;
}

function generateAssignmentReason(scores: any): string {
  const factors = [];
  if (scores.proximity_score > 70) factors.push('proximity');
  if (scores.priority_score > 70) factors.push('priority');
  if (scores.workload_score > 70) factors.push('low workload');
  if (scores.stock_score > 70) factors.push('good stock');

  if (factors.length === 0) factors.push('best available match');
  return `Best match based on: ${factors.join(', ')}`;
}