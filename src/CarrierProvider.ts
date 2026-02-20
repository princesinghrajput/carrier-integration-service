import type { RateRequest, RateQuote } from './domain.js';

// Any carrier (FedEx, USPS, DHL) plugs in by implementing this interface.
// ShippingService depends on this contract, never on a specific carrier.
export interface CarrierProvider {
    readonly name: string;
    getRates(request: RateRequest): Promise<RateQuote[]>;
}
