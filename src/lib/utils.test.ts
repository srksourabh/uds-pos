import { describe, it, expect } from 'vitest';

// Test the sanitizeSearchInput function logic (replicated here for testing)
function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  const sanitized = input
    .replace(/[%*]/g, '')
    .replace(/[()]/g, '')
    .replace(/\./g, ' ')
    .trim()
    .slice(0, 100);
  return sanitized;
}

describe('Utility Functions', () => {
  describe('sanitizeSearchInput', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeSearchInput('')).toBe('');
    });

    it('should return empty string for null-like input', () => {
      expect(sanitizeSearchInput(null as unknown as string)).toBe('');
      expect(sanitizeSearchInput(undefined as unknown as string)).toBe('');
    });

    it('should remove wildcard characters', () => {
      expect(sanitizeSearchInput('test%value')).toBe('testvalue');
      expect(sanitizeSearchInput('test*value')).toBe('testvalue');
      expect(sanitizeSearchInput('%*test%*')).toBe('test');
    });

    it('should remove parentheses', () => {
      expect(sanitizeSearchInput('test(value)')).toBe('testvalue');
      expect(sanitizeSearchInput('(test)')).toBe('test');
    });

    it('should replace dots with spaces', () => {
      expect(sanitizeSearchInput('test.value')).toBe('test value');
      expect(sanitizeSearchInput('a.b.c')).toBe('a b c');
    });

    it('should trim whitespace', () => {
      expect(sanitizeSearchInput('  test  ')).toBe('test');
      expect(sanitizeSearchInput('\t test \n')).toBe('test');
    });

    it('should limit length to 100 characters', () => {
      const longString = 'a'.repeat(150);
      expect(sanitizeSearchInput(longString).length).toBe(100);
    });

    it('should handle combined special characters', () => {
      // (test%*.value) -> test.value -> test value (dot becomes space, then trim collapses spaces)
      expect(sanitizeSearchInput('(test%*.value)')).toBe('test value');
    });

    it('should preserve regular alphanumeric characters', () => {
      expect(sanitizeSearchInput('Hello123World')).toBe('Hello123World');
    });

    it('should preserve spaces between words', () => {
      expect(sanitizeSearchInput('hello world')).toBe('hello world');
    });

    it('should handle unicode characters', () => {
      expect(sanitizeSearchInput('тест')).toBe('тест');
      expect(sanitizeSearchInput('测试')).toBe('测试');
    });
  });
});

describe('Type Validation Helpers', () => {
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s-]{10,15}$/;
    return phoneRegex.test(phone);
  };

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('no@domain')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct phone formats', () => {
      expect(isValidPhone('+1234567890')).toBe(true);
      expect(isValidPhone('123-456-7890')).toBe(true);
      expect(isValidPhone('+91 12345 67890')).toBe(true);
    });

    it('should reject invalid phone formats', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('12345')).toBe(false);
      expect(isValidPhone('abc1234567890')).toBe(false);
    });
  });
});

describe('Date Formatting', () => {
  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  const formatDateTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().replace('T', ' ').slice(0, 19);
  };

  describe('formatDate', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T12:30:00Z');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should format date string to YYYY-MM-DD', () => {
      expect(formatDate('2024-06-20T15:45:30Z')).toBe('2024-06-20');
    });
  });

  describe('formatDateTime', () => {
    it('should format Date object to YYYY-MM-DD HH:MM:SS', () => {
      const date = new Date('2024-01-15T12:30:45Z');
      expect(formatDateTime(date)).toBe('2024-01-15 12:30:45');
    });
  });
});

describe('Array Utilities', () => {
  const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  };

  const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  };

  describe('groupBy', () => {
    it('should group array items by key', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'A' },
      ];
      const result = groupBy(items, 'category');
      expect(result['A'].length).toBe(2);
      expect(result['B'].length).toBe(1);
    });

    it('should handle empty array', () => {
      const result = groupBy([], 'id' as never);
      expect(result).toEqual({});
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates by key', () => {
      const items = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'C' },
      ];
      const result = uniqueBy(items, 'id');
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('A');
    });

    it('should handle empty array', () => {
      const result = uniqueBy([], 'id' as never);
      expect(result).toEqual([]);
    });
  });
});
