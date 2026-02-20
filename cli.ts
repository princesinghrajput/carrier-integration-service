import 'dotenv/config';
import { ShippingService, UpsProvider, loadUpsConfig } from './src/index.js';
import type { RateRequest } from './src/index.js';

const config = loadUpsConfig();
const service = new ShippingService(new UpsProvider(config));

const request: RateRequest = {
    origin: {
        name: 'Sender',
        addressLine1: '123 Main St',
        city: 'New York',
        stateOrProvince: 'NY',
        postalCode: '10001',
        countryCode: 'US',
    },
    destination: {
        name: 'Receiver',
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

async function main() {
    try {
        console.log('Fetching shipping rates...\n');
        const rates = await service.getRates(request);
        console.dir(rates, { depth: null });
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
