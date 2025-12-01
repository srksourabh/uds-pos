import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export function isOCRConfigured(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your-gemini-api-key-here';
}

export interface OCRResult {
  success: boolean;
  serial_number: string | null;
  confidence: number;
  raw_text: string | null;
  error?: string;
}

/**
 * Extract serial number from an image using Gemini Vision
 */
export async function extractSerialFromImage(imageData: string | Blob): Promise<OCRResult> {
  if (!isOCRConfigured()) {
    return {
      success: false,
      serial_number: null,
      confidence: 0,
      raw_text: null,
      error: 'Gemini API key not configured for OCR',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Convert image to base64 if it's a Blob
    let base64Data: string;
    let mimeType: string;

    if (imageData instanceof Blob) {
      const buffer = await imageData.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      base64Data = btoa(String.fromCharCode(...bytes));
      mimeType = imageData.type || 'image/jpeg';
    } else if (imageData.startsWith('data:')) {
      // Data URL
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URL format');
      }
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      // Already base64
      base64Data = imageData;
      mimeType = 'image/jpeg';
    }

    const prompt = `Analyze this image and extract any serial number, model number, or device identifier visible.

Look for:
1. Serial numbers (usually alphanumeric, 8-20 characters)
2. S/N, Serial, SN labels followed by numbers
3. Barcode numbers visible in the image
4. Device identifiers on labels or stickers

Respond in JSON format only:
{
  "found": true/false,
  "serial_number": "extracted serial or null",
  "confidence": 0.0-1.0,
  "raw_text": "all text visible in image",
  "location": "where the serial was found (label, sticker, screen, etc.)"
}

If multiple potential serials are found, return the most likely device serial number.
If no serial number is found, set found to false and serial_number to null.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const response = result.response.text();

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        serial_number: null,
        confidence: 0,
        raw_text: response,
        error: 'Could not parse OCR response',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      success: parsed.found === true,
      serial_number: parsed.serial_number || null,
      confidence: parsed.confidence || 0,
      raw_text: parsed.raw_text || null,
    };
  } catch (error) {
    console.error('OCR error:', error);
    return {
      success: false,
      serial_number: null,
      confidence: 0,
      raw_text: null,
      error: error instanceof Error ? error.message : 'OCR failed',
    };
  }
}

/**
 * Validate if a string looks like a valid serial number
 */
export function isValidSerialFormat(serial: string): boolean {
  if (!serial || serial.length < 6 || serial.length > 30) {
    return false;
  }

  // Must contain at least some alphanumeric characters
  const alphanumericCount = (serial.match(/[A-Z0-9]/gi) || []).length;
  if (alphanumericCount < 4) {
    return false;
  }

  // Should not be all the same character
  if (new Set(serial.toLowerCase()).size < 3) {
    return false;
  }

  return true;
}

/**
 * Auto-generate a serial number with a given prefix
 */
export function generateSerialNumber(prefix: string = 'UDS'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a batch of serial numbers
 */
export function generateSerialBatch(count: number, prefix: string = 'UDS'): string[] {
  const serials: string[] = [];
  const usedSuffixes = new Set<string>();

  for (let i = 0; i < count; i++) {
    let serial: string;
    do {
      serial = generateSerialNumber(prefix);
    } while (usedSuffixes.has(serial));
    usedSuffixes.add(serial);
    serials.push(serial);
  }

  return serials;
}
