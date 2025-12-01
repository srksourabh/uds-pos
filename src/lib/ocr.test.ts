import { describe, it, expect, vi } from 'vitest';
import {
  isValidSerialFormat,
  generateSerialNumber,
  generateSerialBatch,
} from './ocr';

describe('OCR Utilities', () => {
  describe('isValidSerialFormat', () => {
    it('should return true for valid serial numbers', () => {
      expect(isValidSerialFormat('ABC123456')).toBe(true);
      expect(isValidSerialFormat('POS-2024-XYZ123')).toBe(true);
      expect(isValidSerialFormat('SN123456789')).toBe(true);
    });

    it('should return false for too short serials', () => {
      expect(isValidSerialFormat('ABC')).toBe(false);
      expect(isValidSerialFormat('12345')).toBe(false);
    });

    it('should return false for too long serials', () => {
      expect(isValidSerialFormat('A'.repeat(31))).toBe(false);
    });

    it('should return false for empty or null values', () => {
      expect(isValidSerialFormat('')).toBe(false);
      expect(isValidSerialFormat(null as any)).toBe(false);
      expect(isValidSerialFormat(undefined as any)).toBe(false);
    });

    it('should return false for repeated characters', () => {
      expect(isValidSerialFormat('AAAAAAA')).toBe(false);
      expect(isValidSerialFormat('1111111')).toBe(false);
    });

    it('should require minimum alphanumeric characters', () => {
      expect(isValidSerialFormat('---...---')).toBe(false);
    });
  });

  describe('generateSerialNumber', () => {
    it('should generate a serial with default prefix', () => {
      const serial = generateSerialNumber();
      expect(serial).toMatch(/^UDS-[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it('should generate a serial with custom prefix', () => {
      const serial = generateSerialNumber('POS');
      expect(serial).toMatch(/^POS-[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it('should generate unique serials', () => {
      const serials = new Set<string>();
      for (let i = 0; i < 100; i++) {
        serials.add(generateSerialNumber());
      }
      expect(serials.size).toBe(100);
    });
  });

  describe('generateSerialBatch', () => {
    it('should generate the requested number of serials', () => {
      const batch = generateSerialBatch(10);
      expect(batch).toHaveLength(10);
    });

    it('should generate unique serials in batch', () => {
      const batch = generateSerialBatch(50);
      const uniqueSet = new Set(batch);
      expect(uniqueSet.size).toBe(50);
    });

    it('should use custom prefix', () => {
      const batch = generateSerialBatch(5, 'TEST');
      batch.forEach(serial => {
        expect(serial).toMatch(/^TEST-/);
      });
    });
  });
});
