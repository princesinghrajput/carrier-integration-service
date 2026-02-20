import type { UpsRateResponse, UpsTokenResponse } from '../../src/carriers/ups/types.js';

export const TOKEN_RESPONSE: UpsTokenResponse = {
    access_token: 'test-token-abc123',
    token_type: 'Bearer',
    expires_in: 14400,
};

export const RATE_RESPONSE: UpsRateResponse = {
    RateResponse: {
        RatedShipment: [
            {
                Service: { Code: '03' },
                TotalCharges: {
                    CurrencyCode: 'USD',
                    MonetaryValue: '12.50',
                },
                GuaranteedDelivery: {
                    BusinessDaysInTransit: '5',
                },
            },
            {
                Service: { Code: '02' },
                TotalCharges: {
                    CurrencyCode: 'USD',
                    MonetaryValue: '24.99',
                },
                GuaranteedDelivery: {
                    BusinessDaysInTransit: '2',
                },
            },
            {
                Service: { Code: '01' },
                TotalCharges: {
                    CurrencyCode: 'USD',
                    MonetaryValue: '45.00',
                },
                GuaranteedDelivery: {
                    BusinessDaysInTransit: '1',
                },
            },
        ],
    },
};

export const ERROR_RESPONSE = {
    response: {
        errors: [
            {
                code: '111210',
                message: 'The requested service is unavailable between the selected locations.',
            },
        ],
    },
};
