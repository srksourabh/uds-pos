import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProblemCodes as useProblemCodesHook } from '../lib/api-hooks';
import type { ProblemCode } from '../lib/database.types';

interface ProblemCodeSelectProps {
  value: string | null;
  onChange: (code: string | null, problemCode?: ProblemCode) => void;
  disabled?: boolean;
  className?: string;
  showDescription?: boolean;
}

interface GroupedCodes {
  [category: string]: ProblemCode[];
}

/**
 * ProblemCodeSelect component for selecting problem codes
 * Groups codes by category for easier selection
 */
export function ProblemCodeSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  showDescription = false,
}: ProblemCodeSelectProps) {
  const { codes: problemCodes, loading } = useProblemCodesHook();
  const [error] = useState<string | null>(null);

  // Group codes by category
  const groupedCodes = problemCodes.reduce<GroupedCodes>((acc, code) => {
    const category = code.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(code);
    return acc;
  }, {});

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value || null;
    const selectedProblemCode = problemCodes.find(pc => pc.code === selectedCode);
    onChange(selectedCode, selectedProblemCode);
  };

  const selectedProblemCode = problemCodes.find(pc => pc.code === value);

  if (loading) {
    return (
      <select
        disabled
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 ${className}`}
      >
        <option>Loading...</option>
      </select>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
        } ${className}`}
      >
        <option value="">Select Problem Code</option>
        {Object.entries(groupedCodes).map(([category, codes]) => (
          <optgroup key={category} label={category}>
            {codes.map((code) => (
              <option key={code.id} value={code.code}>
                {code.code} - {code.description}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {showDescription && selectedProblemCode && (
        <p className="text-xs text-gray-500">
          {selectedProblemCode.description}
          {selectedProblemCode.default_sla_hours && (
            <span className="ml-2 text-blue-600">
              (Default SLA: {selectedProblemCode.default_sla_hours}h)
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * ProblemCodeBadge - Display a problem code as a badge
 */
export function ProblemCodeBadge({ code }: { code: string | null }) {
  if (!code) return null;

  // Color mapping for categories (derived from code prefix)
  const getColor = (problemCode: string): string => {
    if (problemCode.startsWith('NO_') || problemCode.startsWith('PAPER') || problemCode.startsWith('CARD')) {
      return 'bg-red-100 text-red-700'; // Hardware
    }
    if (problemCode.startsWith('CONN')) {
      return 'bg-purple-100 text-purple-700'; // Network
    }
    if (problemCode.startsWith('SW_')) {
      return 'bg-yellow-100 text-yellow-700'; // Software
    }
    if (problemCode === 'INSTALL' || problemCode === 'UNINSTALL') {
      return 'bg-blue-100 text-blue-700'; // Installation
    }
    if (problemCode === 'SWAP') {
      return 'bg-green-100 text-green-700'; // Maintenance
    }
    return 'bg-gray-100 text-gray-700'; // Default
  };

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getColor(code)}`}>
      {code}
    </span>
  );
}

/**
 * useProblemCodesLocal hook for accessing problem codes locally
 * Note: Prefer useProblemCodes from api-hooks.ts for new code
 */
export function useProblemCodesLocal() {
  const { codes: problemCodes, loading } = useProblemCodesHook();
  const [error] = useState<string | null>(null);

  const getByCode = (code: string) => problemCodes.find(pc => pc.code === code);

  return { problemCodes, loading, error, getByCode };
}
