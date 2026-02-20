import axios from 'axios';
import type { CarrierProvider } from '../../CarrierProvider.js';
import type { RateRequest, RateQuote } from '../../domain.js';
import type { UpsConfig } from '../../config.js';
import type { UpsRateResponse } from './types.js';
import { UpsAuthManager } from './UpsAuthManager.js';
import { toUpsRateRequest, fromUpsRateResponse } from './mappers.js';
import {
    AuthError,
    NetworkError,
    RateLimitedError,
    CarrierApiError,
} from '../../errors.js';

export class UpsProvider implements CarrierProvider {
    readonly name = 'UPS';
    private auth: UpsAuthManager;
    private baseUrl: string;

    constructor(config: UpsConfig) {
        this.auth = new UpsAuthManager(config);
        this.baseUrl = config.baseUrl;
    }

    async getRates(request: RateRequest): Promise<RateQuote[]> {
        const token = await this.auth.getToken();
        const body = toUpsRateRequest(request);

        try {
            const response = await axios.post<UpsRateResponse>(
                `${this.baseUrl}/api/rating/v2403/Shop`,
                body,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 15_000,
                },
            );

            return fromUpsRateResponse(response.data);
        } catch (error) {
            if (!axios.isAxiosError(error)) {
                throw new CarrierApiError('Unexpected error calling UPS Rating API');
            }

            const status = error.response?.status;

            if (status === 401) {
                throw new AuthError('UPS authentication failed', {
                    status,
                    data: error.response?.data,
                });
            }

            if (status === 429) {
                throw new RateLimitedError('UPS rate limit exceeded', { status });
            }

            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                throw new NetworkError('UPS API request timed out', {
                    code: error.code,
                });
            }

            if (!error.response) {
                throw new NetworkError('Could not reach UPS API', {
                    code: error.code,
                });
            }

            throw new CarrierApiError('UPS API returned an error', {
                status,
                data: error.response?.data,
            });
        }
    }
}
