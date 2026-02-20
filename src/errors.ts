// Each error type maps to a specific failure mode callers can handle individually.
// This avoids parsing error messages to figure out what went wrong.
export type ErrorCode =
    | 'AUTH_FAILED'
    | 'VALIDATION_FAILED'
    | 'NETWORK_ERROR'
    | 'RATE_LIMITED'
    | 'CARRIER_API_ERROR';

export class CarrierError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly context?: Record<string, unknown>,
    ) {
        super(message);
        // Required in Node.js for instanceof to work correctly with custom Error subclasses
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace?.(this, this.constructor);
        this.name = 'CarrierError';
    }
}

export class AuthError extends CarrierError {
    constructor(message: string, context?: Record<string, unknown>) {
        super('AUTH_FAILED', message, context);
        this.name = 'AuthError';
    }
}

export class ValidationError extends CarrierError {
    constructor(message: string, context?: Record<string, unknown>) {
        super('VALIDATION_FAILED', message, context);
        this.name = 'ValidationError';
    }
}

export class NetworkError extends CarrierError {
    constructor(message: string, context?: Record<string, unknown>) {
        super('NETWORK_ERROR', message, context);
        this.name = 'NetworkError';
    }
}

export class RateLimitedError extends CarrierError {
    constructor(message: string, context?: Record<string, unknown>) {
        super('RATE_LIMITED', message, context);
        this.name = 'RateLimitedError';
    }
}

export class CarrierApiError extends CarrierError {
    constructor(message: string, context?: Record<string, unknown>) {
        super('CARRIER_API_ERROR', message, context);
        this.name = 'CarrierApiError';
    }
}
