# Carrier Integration Service

A TypeScript module that wraps the UPS Rating API behind a carrier-agnostic interface.

This project is designed as a take-home exercise demonstrating how to build a production-style third-party carrier integration layer.

It's not a web server. It's a library that a backend service would import to get shipping rates. The behavior is verified through integration tests using mocked HTTP, so everything runs locally without UPS credentials.

The idea is simple: isolate carrier-specific API details so your application code never touches them. To swap UPS for another carrier, you add a new provider implementation and update configuration. The application code does not change.

## Quick Start

```bash
git clone https://github.com/princesinghrajput/carrier-integration-service.git
cd carrier-integration-service
npm install
npm run build
npm test
```

All HTTP calls are stubbed with **nock**. No API keys needed.

## Running the Example

A CLI example is included to show how the pieces wire together:

```bash
npm run dev
```

It will attempt to call UPS and fail without credentials, which is expected. The test suite verifies the integration behavior and request/response mapping.

## Configuration

Environment variables are defined in `.env.example`.

Create a `.env` file if you want to run against real credentials:

```
UPS_CLIENT_ID=
UPS_CLIENT_SECRET=
UPS_BASE_URL=https://onlinetools.ups.com
UPS_TOKEN_URL=https://onlinetools.ups.com/security/v1/oauth/token
```

## How It Works

```
Your app → ShippingService → CarrierProvider (interface) → UpsProvider → UPS API
                                                                ↓
                                                         RateQuote[] (clean data)
```

Your application talks to `ShippingService` using domain types (`RateRequest`, `RateQuote`). It never sees UPS field names like `RatedShipment` or `MonetaryValue`. The mapper handles all of that internally.

The point of this module isn't just calling the UPS API. It's showing how a production system isolates third-party services behind an internal domain model, so the rest of the application is protected from vendor formats, failures, and changes.

## Usage

```ts
// after `npm run build`
import { ShippingService, UpsProvider } from './dist/index.js';

const provider = new UpsProvider({
  clientId: process.env.UPS_CLIENT_ID!,
  clientSecret: process.env.UPS_CLIENT_SECRET!,
  baseUrl: 'https://onlinetools.ups.com',
  tokenUrl: 'https://onlinetools.ups.com/security/v1/oauth/token',
});

const service = new ShippingService(provider);

const rates = await service.getRates({
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
  parcels: [{ weight: { value: 5, unit: 'LBS' } }],
});
```

In tests, config is injected directly. In production, it would come from env vars via `loadUpsConfig()`.

## Design Decisions

**Domain-first types.** `RateRequest`, `RateQuote`, `Address`, `Parcel` describe shipping concepts, not UPS concepts. UPS field names stay inside `src/carriers/ups/` and never leak out.

**Zod for validation.** Schemas are the single source of truth for both TypeScript types and runtime checks. `ShippingService` validates input before any HTTP call goes out.

**Structured errors.** Five specific error classes (`AuthError`, `ValidationError`, `NetworkError`, `RateLimitedError`, `CarrierApiError`) instead of generic throws. Callers can handle each failure differently.

**Token lifecycle.** `UpsAuthManager` caches OAuth tokens, refreshes 60s before expiry, and deduplicates concurrent token requests so parallel `getRates()` calls don't hammer the auth endpoint.

**Defensive parsing.** The mapper doesn't trust UPS responses blindly. Missing service codes, invalid monetary values, or unexpected response shapes throw `CarrierApiError` instead of producing garbage data.

The carrier adapter pattern keeps vendor logic at the boundary of the system. All normalization occurs at the integration edge instead of spreading carrier-specific logic throughout the application.

## Project Structure

```
src/
  domain.ts            domain types + Zod schemas
  errors.ts            error hierarchy
  config.ts            env var validation
  CarrierProvider.ts   interface any carrier implements
  ShippingService.ts   validates input, delegates to provider

  carriers/ups/
    types.ts           raw UPS DTOs (never used outside this folder)
    mappers.ts         domain <-> UPS translation boundary
    UpsAuthManager.ts  OAuth2 with token caching
    UpsProvider.ts     implements CarrierProvider for UPS

tests/
  fixtures/            mocked UPS API responses
  integration/         end-to-end tests with nock
```

## Tests

```bash
npm test
```

10 tests covering: input validation, request construction, response normalization, token reuse, auth errors, rate limiting, network failures, server errors, and malformed carrier responses. No real API calls.

## Scope

Only **rate shopping** is implemented. Label generation, tracking, and address validation are out of scope. This project is focused on the integration architecture.

## What I'd Improve

- Retry with exponential backoff for transient failures (429, 5xx)
- Request logging with redacted credentials
- Rate caching to avoid duplicate API calls for identical requests
- Multi-carrier aggregation: query UPS + FedEx in parallel, merge results
