import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your-gemini-api-key-here';
}

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!isGeminiConfigured()) {
      throw new Error('Gemini API key not configured');
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

export interface CallContext {
  call_id: string;
  call_number: string;
  call_type: string;
  priority: string;
  client_name: string;
  client_address: string;
  latitude: number | null;
  longitude: number | null;
  scheduled_date: string | null;
  description: string | null;
  requires_photo: boolean;
}

export interface EngineerContext {
  engineer_id: string;
  name: string;
  skills: string[] | null;
  current_workload: number;
  completed_calls_today: number;
  avg_completion_time: number | null;
  distance_km: number | null;
  latitude: number | null;
  longitude: number | null;
  stock_available: number;
  performance_score: number | null;
}

export interface GeminiScoreResult {
  engineer_id: string;
  ai_score: number;
  confidence: number;
  reasoning: string;
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    explanation: string;
  }[];
  recommendation: string;
}

export interface BatchScoreResult {
  call_id: string;
  scores: GeminiScoreResult[];
  best_match: {
    engineer_id: string;
    reasoning: string;
  };
  processing_time_ms: number;
}

const SCORING_PROMPT = `You are an AI assistant helping to assign field service calls to engineers.
Analyze the call requirements and engineer profiles to provide optimal assignment scores.

For each engineer, provide:
1. A score from 0-100 (higher is better fit)
2. Confidence level (0-1)
3. Clear reasoning
4. Key factors that influenced the score
5. A recommendation

Consider these factors:
- Distance/proximity to the call location
- Engineer's current workload (fewer active calls = better)
- Skills match for the call type
- Historical performance (completion rate, average time)
- Stock availability for required devices
- Priority alignment (urgent calls need responsive engineers)
- Time efficiency (avoid clustering multiple urgent calls on one engineer)

Respond in JSON format only.`;

export async function scoreEngineerForCall(
  call: CallContext,
  engineer: EngineerContext
): Promise<GeminiScoreResult> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `${SCORING_PROMPT}

CALL DETAILS:
- Call Number: ${call.call_number}
- Type: ${call.call_type}
- Priority: ${call.priority}
- Client: ${call.client_name}
- Address: ${call.client_address}
- Description: ${call.description || 'N/A'}
- Scheduled Date: ${call.scheduled_date || 'ASAP'}
- Requires Photo: ${call.requires_photo ? 'Yes' : 'No'}

ENGINEER PROFILE:
- Name: ${engineer.name}
- Skills: ${engineer.skills?.join(', ') || 'General'}
- Current Workload: ${engineer.current_workload} active calls
- Completed Today: ${engineer.completed_calls_today} calls
- Avg Completion Time: ${engineer.avg_completion_time ? `${engineer.avg_completion_time} minutes` : 'N/A'}
- Distance to Call: ${engineer.distance_km ? `${engineer.distance_km.toFixed(1)} km` : 'Unknown'}
- Stock Available: ${engineer.stock_available} devices
- Performance Score: ${engineer.performance_score ? `${engineer.performance_score}/100` : 'N/A'}

Provide a JSON response with this exact structure:
{
  "engineer_id": "${engineer.engineer_id}",
  "ai_score": <number 0-100>,
  "confidence": <number 0-1>,
  "reasoning": "<string explaining the score>",
  "factors": [
    {
      "factor": "<factor name>",
      "impact": "<positive|negative|neutral>",
      "weight": <number 0-1>,
      "explanation": "<brief explanation>"
    }
  ],
  "recommendation": "<brief recommendation>"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeminiScoreResult;
    return parsed;
  } catch (error) {
    console.error('Gemini scoring error:', error);
    // Return fallback score
    return {
      engineer_id: engineer.engineer_id,
      ai_score: 50,
      confidence: 0.3,
      reasoning: 'AI scoring unavailable, using fallback',
      factors: [],
      recommendation: 'Manual review recommended',
    };
  }
}

export async function batchScoreEngineers(
  call: CallContext,
  engineers: EngineerContext[],
  maxConcurrent: number = 3
): Promise<BatchScoreResult> {
  const startTime = Date.now();
  const scores: GeminiScoreResult[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < engineers.length; i += maxConcurrent) {
    const batch = engineers.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(eng => scoreEngineerForCall(call, eng))
    );
    scores.push(...batchResults);
  }

  // Sort by score and get best match
  const sortedScores = [...scores].sort((a, b) => b.ai_score - a.ai_score);
  const best = sortedScores[0];

  return {
    call_id: call.call_id,
    scores,
    best_match: {
      engineer_id: best.engineer_id,
      reasoning: best.reasoning,
    },
    processing_time_ms: Date.now() - startTime,
  };
}

export async function getAssignmentExplanation(
  call: CallContext,
  assignedEngineer: EngineerContext,
  alternativeEngineers: EngineerContext[]
): Promise<string> {
  if (!isGeminiConfigured()) {
    return 'AI explanation not available - Gemini API key not configured';
  }

  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Explain why ${assignedEngineer.name} was assigned to call ${call.call_number} in 2-3 sentences.

Call: ${call.call_type} - ${call.priority} priority at ${call.client_address}
Assigned Engineer: ${assignedEngineer.name} (${assignedEngineer.distance_km?.toFixed(1) || '?'} km away, ${assignedEngineer.current_workload} active calls)
Alternatives considered: ${alternativeEngineers.map(e => `${e.name} (${e.distance_km?.toFixed(1) || '?'} km, ${e.current_workload} calls)`).join(', ')}

Be concise and focus on the key decision factors.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini explanation error:', error);
    return 'Unable to generate explanation';
  }
}

export async function analyzeWorkloadDistribution(
  engineers: { name: string; active_calls: number; completed_today: number }[]
): Promise<{
  analysis: string;
  recommendations: string[];
  overloaded: string[];
  underutilized: string[];
}> {
  if (!isGeminiConfigured()) {
    return {
      analysis: 'AI analysis not available',
      recommendations: [],
      overloaded: [],
      underutilized: [],
    };
  }

  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const engineerData = engineers.map(e =>
    `${e.name}: ${e.active_calls} active, ${e.completed_today} completed today`
  ).join('\n');

  const prompt = `Analyze this engineer workload distribution and provide recommendations:

${engineerData}

Respond in JSON format:
{
  "analysis": "<2-3 sentence analysis>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "overloaded": ["<engineer names who have too many calls>"],
  "underutilized": ["<engineer names who could take more calls>"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Gemini workload analysis error:', error);
    return {
      analysis: 'Unable to analyze workload',
      recommendations: [],
      overloaded: [],
      underutilized: [],
    };
  }
}
