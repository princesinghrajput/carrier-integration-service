import { RateRequestSchema, type RateRequest, type RateQuote } from './domain.js';
import { ValidationError } from './errors.js';
import type { CarrierProvider } from './CarrierProvider.js';

export class ShippingService {
    private provider: CarrierProvider;

    constructor(provider: CarrierProvider) {
        this.provider = provider;
    }

    async getRates(request: RateRequest): Promise<RateQuote[]> {
        const result = RateRequestSchema.safeParse(request);

        if (!result.success) {
            const details = result.error.issues.map((i) => i.message).join('; ');
            throw new ValidationError(`Invalid rate request: ${details}`, {
                issues: result.error.issues,
            });
        }

        return this.provider.getRates(result.data);
    }
}
