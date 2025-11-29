export interface ApiError {
  error: string;
  error_code?: string;
  details?: any;
  retry_after?: number;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON(): ApiError {
    const response: ApiError = {
      error: this.message,
      error_code: this.code,
    };

    if (this.details) {
      response.details = this.details;
    }

    if (this.retryAfter) {
      response.retry_after = this.retryAfter;
    }

    return response;
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  CONFLICT: { code: 'CONFLICT', status: 409 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400 },
  RATE_LIMIT_EXCEEDED: { code: 'RATE_LIMIT_EXCEEDED', status: 429 },
  INTERNAL_SERVER_ERROR: { code: 'INTERNAL_SERVER_ERROR', status: 500 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503 },
  GATEWAY_TIMEOUT: { code: 'GATEWAY_TIMEOUT', status: 504 },

  CALL_NOT_FOUND: { code: 'CALL_NOT_FOUND', status: 404 },
  CALL_NOT_ASSIGNED_TO_YOU: { code: 'CALL_NOT_ASSIGNED_TO_YOU', status: 403 },
  INVALID_CALL_STATUS: { code: 'INVALID_CALL_STATUS', status: 400 },
  CONCURRENT_COMPLETION: { code: 'CONCURRENT_COMPLETION', status: 409 },
  CALL_ALREADY_ASSIGNED: { code: 'CALL_ALREADY_ASSIGNED', status: 409 },

  DEVICE_NOT_FOUND: { code: 'DEVICE_NOT_FOUND', status: 404 },
  DEVICE_BANK_MISMATCH: { code: 'DEVICE_BANK_MISMATCH', status: 400 },
  DEVICE_NOT_ASSIGNED_TO_YOU: { code: 'DEVICE_NOT_ASSIGNED_TO_YOU', status: 403 },
  DEVICE_ALREADY_INSTALLED: { code: 'DEVICE_ALREADY_INSTALLED', status: 409 },
  DEVICE_NOT_AVAILABLE: { code: 'DEVICE_NOT_AVAILABLE', status: 409 },
  DEVICE_IN_TRANSIT: { code: 'DEVICE_IN_TRANSIT', status: 409 },
  DEVICE_ALREADY_FAULTY: { code: 'DEVICE_ALREADY_FAULTY', status: 409 },
  DEVICE_ALREADY_ISSUED: { code: 'DEVICE_ALREADY_ISSUED', status: 409 },

  ENGINEER_NOT_FOUND: { code: 'ENGINEER_NOT_FOUND', status: 404 },
  ENGINEER_NOT_ACTIVE: { code: 'ENGINEER_NOT_ACTIVE', status: 400 },
  ENGINEER_NOT_IN_ROLE: { code: 'ENGINEER_NOT_IN_ROLE', status: 400 },
  ENGINEER_BANK_MISMATCH: { code: 'ENGINEER_BANK_MISMATCH', status: 400 },

  BANK_NOT_FOUND: { code: 'BANK_NOT_FOUND', status: 404 },
  BANK_MISMATCH: { code: 'BANK_MISMATCH', status: 400 },

  RESOLUTION_NOTES_TOO_SHORT: { code: 'RESOLUTION_NOTES_TOO_SHORT', status: 400 },
  FAULT_DESCRIPTION_TOO_SHORT: { code: 'FAULT_DESCRIPTION_TOO_SHORT', status: 400 },
  REASON_TOO_SHORT: { code: 'REASON_TOO_SHORT', status: 400 },
  NO_DEVICES_PROVIDED: { code: 'NO_DEVICES_PROVIDED', status: 400 },
  PHOTO_REQUIRED: { code: 'PHOTO_REQUIRED', status: 400 },
  INVALID_ESTIMATED_COST: { code: 'INVALID_ESTIMATED_COST', status: 400 },
  INVALID_WEIGHTS: { code: 'INVALID_WEIGHTS', status: 400 },
  INVALID_CALL_IDS: { code: 'INVALID_CALL_IDS', status: 400 },
  INVALID_DATE_RANGE: { code: 'INVALID_DATE_RANGE', status: 400 },
  INVALID_BANK_CODE: { code: 'INVALID_BANK_CODE', status: 400 },
  DUPLICATE_SERIAL: { code: 'DUPLICATE_SERIAL', status: 409 },
  MISSING_REQUIRED_FIELDS: { code: 'MISSING_REQUIRED_FIELDS', status: 400 },
  SAME_SOURCE_DESTINATION: { code: 'SAME_SOURCE_DESTINATION', status: 400 },
  INVALID_DEVICE_STATUS: { code: 'INVALID_DEVICE_STATUS', status: 400 },

  BULK_LIMIT_EXCEEDED: { code: 'BULK_LIMIT_EXCEEDED', status: 400 },
  EXPORT_TOO_LARGE: { code: 'EXPORT_TOO_LARGE', status: 413 },
  INSUFFICIENT_STOCK: { code: 'INSUFFICIENT_STOCK', status: 409 },
};

export function createError(
  errorType: keyof typeof ErrorCodes,
  message?: string,
  details?: any,
  retryAfter?: number
): AppError {
  const errorDef = ErrorCodes[errorType];
  return new AppError(
    message || errorType.toLowerCase().replace(/_/g, ' '),
    errorDef.code,
    errorDef.status,
    details,
    retryAfter
  );
}
