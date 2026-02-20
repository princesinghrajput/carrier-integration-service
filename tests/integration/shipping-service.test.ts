import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { ShippingService } from '../../src/ShippingService.js';
import { UpsProvider } from '../../src/carriers/ups/UpsProvider.js';
import type { UpsConfig } from '../../src/config.js';
import type { RateRequest } from '../../src/domain.js';
import { AuthError, NetworkError, RateLimitedError, CarrierApiError, ValidationError } from '../../src/errors.js';
import { TOKEN_RESPONSE, RATE_RESPONSE, ERROR_RESPONSE } from '../fixtures/ups-responses.js';

const TEST_CONFIG: UpsConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    baseUrl: 'https://onlinetools.ups.com',
    tokenUrl: 'https://onlinetools.ups.com/security/v1/oauth/token',
};

const VALID_REQUEST: RateRequest = {
    origin: {
        addressLine1: '123 Main St',
        city: 'New York',
        stateOrProvince: 'NY',
        postalCode: '10001',
        countryCode: 'US',
    },
    destination: {
        addressLine1: '456 Oak Ave',
        city: 'Los Angeles',
        stateOrProvince: 'CA',
        postalCode: '90001',
        countryCode: 'US',
    },
    parcels: [
        {
            weight: { value: 5, unit: 'LBS' },
            dimensions: { length: 10, width: 8, height: 6, unit: 'IN' },
        },
    ],
};

function stubAuth() {
    return nock('https://onlinetools.ups.com')
        .post('/security/v1/oauth/token')
        .reply(200, TOKEN_RESPONSE);
}

function stubRating(statusCode = 200, body: nock.Body = RATE_RESPONSE) {
    return nock('https://onlinetools.ups.com')
        .post('/api/rating/v2403/Shop')
        .reply(statusCode, body);
}

describe('ShippingService + UpsProvider integration', () => {
    let service: ShippingService;

    beforeEach(() => {
        const provider = new UpsProvider(TEST_CONFIG);
        service = new ShippingService(provider);
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    it('rejects invalid input before making any HTTP call', async () => {
        const badRequest = { origin: {}, destination: {}, parcels: [] } as unknown as RateRequest;

        try {
            await service.getRates(badRequest);
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(ValidationError);
            expect(nock.pendingMocks()).toHaveLength(0);
        }
    });

    it('returns normalized rate quotes from UPS response', async () => {
        stubAuth();
        stubRating();

        const quotes = await service.getRates(VALID_REQUEST);

        expect(quotes).toHaveLength(3);

        expect(quotes[0]).toEqual({
            carrier: 'UPS',
            serviceName: 'Ground',
            serviceCode: '03',
            totalCharge: { amount: 12.5, currency: 'USD' },
            transitDays: 5,
        });

        expect(quotes[1]).toEqual({
            carrier: 'UPS',
            serviceName: '2nd Day Air',
            serviceCode: '02',
            totalCharge: { amount: 24.99, currency: 'USD' },
            transitDays: 2,
        });
    });

    it('sends correctly structured UPS request payload', async () => {
        stubAuth();

        const ratingScope = nock('https://onlinetools.ups.com')
            .post('/api/rating/v2403/Shop', (body) => {
                const shipment = body.RateRequest?.Shipment;
                const pkg = shipment?.Package?.[0];
                return (
                    shipment?.ShipFrom?.Address?.PostalCode === '10001' &&
                    shipment?.ShipTo?.Address?.PostalCode === '90001' &&
                    shipment?.PickupType?.Code === '01' &&
                    pkg?.PackageWeight?.Weight === '5' &&
                    pkg?.PackageWeight?.UnitOfMeasurement?.Code === 'LBS'
                );
            })
            .reply(200, RATE_RESPONSE);

        await service.getRates(VALID_REQUEST);
        expect(ratingScope.isDone()).toBe(true);
    });

    it('reuses auth token across multiple calls', async () => {
        const authScope = nock('https://onlinetools.ups.com')
            .post('/security/v1/oauth/token')
            .once()
            .reply(200, TOKEN_RESPONSE);

        stubRating();
        stubRating();

        await service.getRates(VALID_REQUEST);
        await service.getRates(VALID_REQUEST);

        expect(authScope.isDone()).toBe(true);
    });

    it('throws AuthError on 401 from rating endpoint', async () => {
        stubAuth();
        stubRating(401, { message: 'Unauthorized' });

        try {
            await service.getRates(VALID_REQUEST);
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(AuthError);
        }
    });

    it('throws AuthError when token request fails', async () => {
        nock('https://onlinetools.ups.com')
            .post('/security/v1/oauth/token')
            .reply(401, { message: 'Invalid credentials' });

        try {
            await service.getRates(VALID_REQUEST);
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(AuthError);
        }
    });

    it('throws RateLimitedError on 429', async () => {
        stubAuth();
        stubRating(429, { message: 'Too many requests' });

        try {
            await service.getRates(VALID_REQUEST);
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(RateLimitedError);
        }
    });

    it('throws NetworkError on connection failure', async () => {
        stubAuth();

        nock('https://onlinetools.ups.com')
            .post('/api/rating/v2403/Shop')
            .replyWithError('connect ECONNREFUSED 127.0.0.1:443');

        try {
            await service.getRates(VALID_REQUEST);
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(NetworkError);
        }
    });

    it('throws CarrierApiError on server error', async () => {
        stubAuth();
        stubRating(500, ERROR_RESPONSE);

        try {
            await service.getRates(VALID_REQUEST);
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(CarrierApiError);
        }
    });

    it('throws CarrierApiError on invalid UPS response shape', async () => {
        stubAuth();
        stubRating(200, { foo: 'bar' });

        try {
            await service.getRates(VALID_REQUEST);
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(CarrierApiError);
        }
    });
});
