import { useState, useCallback } from 'react';
import {
  extractSerialFromImage,
  isValidSerialFormat,
  generateSerialNumber,
  isOCRConfigured,
  OCRResult,
} from './ocr';

export function useOCRStatus() {
  return {
    isConfigured: isOCRConfigured(),
  };
}

export function useSerialOCR() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);

  const extractSerial = useCallback(async (imageData: string | Blob) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ocrResult = await extractSerialFromImage(imageData);
      setResult(ocrResult);

      if (!ocrResult.success) {
        setError(ocrResult.error || 'No serial number found');
      }

      return ocrResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateSerial = useCallback((serial: string) => {
    return isValidSerialFormat(serial);
  }, []);

  const generateSerial = useCallback((prefix?: string) => {
    return generateSerialNumber(prefix);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    extractSerial,
    validateSerial,
    generateSerial,
    loading,
    error,
    result,
    reset,
  };
}

export function useSerialScanner() {
  const [mode, setMode] = useState<'qr' | 'ocr' | 'manual'>('qr');
  const [serial, setSerial] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const { extractSerial, loading: ocrLoading, error: ocrError, result: ocrResult } = useSerialOCR();

  const handleQRScan = useCallback((scannedValue: string) => {
    setSerial(scannedValue);
    setConfidence(1); // QR codes are 100% accurate
    setMode('qr');
  }, []);

  const handleOCRCapture = useCallback(async (imageData: string | Blob) => {
    const result = await extractSerial(imageData);
    if (result?.success && result.serial_number) {
      setSerial(result.serial_number);
      setConfidence(result.confidence);
      setMode('ocr');
    }
    return result;
  }, [extractSerial]);

  const handleManualEntry = useCallback((value: string) => {
    setSerial(value);
    setConfidence(isValidSerialFormat(value) ? 0.8 : 0.5);
    setMode('manual');
  }, []);

  const handleAutoGenerate = useCallback((prefix?: string) => {
    const generated = generateSerialNumber(prefix);
    setSerial(generated);
    setConfidence(1);
    setMode('manual');
    return generated;
  }, []);

  const reset = useCallback(() => {
    setSerial('');
    setConfidence(0);
    setMode('qr');
  }, []);

  return {
    mode,
    serial,
    confidence,
    ocrLoading,
    ocrError,
    ocrResult,
    handleQRScan,
    handleOCRCapture,
    handleManualEntry,
    handleAutoGenerate,
    reset,
    setMode,
  };
}
