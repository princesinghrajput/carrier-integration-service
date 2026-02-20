import type { RateRequest, RateQuote } from './domain.js';

export interface CarrierProvider {
    readonly name: string;
    getRates(request: RateRequest): Promise<RateQuote[]>;
}
