import { useState, useCallback } from 'react';
import {
  isGeminiConfigured,
  scoreEngineerForCall,
  batchScoreEngineers,
  getAssignmentExplanation,
  analyzeWorkloadDistribution,
  CallContext,
  EngineerContext,
  GeminiScoreResult,
  BatchScoreResult,
} from './gemini';

export function useGeminiStatus() {
  return {
    isConfigured: isGeminiConfigured(),
    apiKeySet: !!import.meta.env.VITE_GEMINI_API_KEY,
  };
}

export function useGeminiScoring() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeminiScoreResult | null>(null);

  const scoreEngineer = useCallback(async (
    call: CallContext,
    engineer: EngineerContext
  ) => {
    if (!isGeminiConfigured()) {
      setError('Gemini API key not configured');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const score = await scoreEngineerForCall(call, engineer);
      setResult(score);
      return score;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scoring failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { scoreEngineer, loading, error, result };
}

export function useGeminiBatchScoring() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchScoreResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const scoreBatch = useCallback(async (
    calls: CallContext[],
    engineers: EngineerContext[]
  ) => {
    if (!isGeminiConfigured()) {
      setError('Gemini API key not configured');
      return [];
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: calls.length });
    setResults([]);

    const batchResults: BatchScoreResult[] = [];

    try {
      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const result = await batchScoreEngineers(call, engineers);
        batchResults.push(result);
        setResults([...batchResults]);
        setProgress({ current: i + 1, total: calls.length });
      }
      return batchResults;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch scoring failed';
      setError(message);
      return batchResults;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setError(null);
  }, []);

  return { scoreBatch, loading, error, results, progress, reset };
}

export function useGeminiExplanation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const getExplanation = useCallback(async (
    call: CallContext,
    assignedEngineer: EngineerContext,
    alternativeEngineers: EngineerContext[]
  ) => {
    setLoading(true);
    setError(null);

    try {
      const text = await getAssignmentExplanation(call, assignedEngineer, alternativeEngineers);
      setExplanation(text);
      return text;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get explanation';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getExplanation, loading, error, explanation };
}

export function useWorkloadAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    analysis: string;
    recommendations: string[];
    overloaded: string[];
    underutilized: string[];
  } | null>(null);

  const analyzeWorkload = useCallback(async (
    engineers: { name: string; active_calls: number; completed_today: number }[]
  ) => {
    if (!isGeminiConfigured()) {
      setError('Gemini API key not configured');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeWorkloadDistribution(engineers);
      setAnalysis(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { analyzeWorkload, loading, error, analysis };
}
