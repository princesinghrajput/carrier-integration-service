export { ShippingService } from './ShippingService.js';
export { UpsProvider } from './carriers/ups/UpsProvider.js';
export { loadUpsConfig } from './config.js';

export type { CarrierProvider } from './CarrierProvider.js';
export type { RateRequest, RateQuote, Address, Parcel, Money } from './domain.js';
export {
    CarrierError,
    AuthError,
    ValidationError,
    NetworkError,
    RateLimitedError,
    CarrierApiError,
} from './errors.js';
