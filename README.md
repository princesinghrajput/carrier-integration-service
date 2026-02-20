# Carrier Integration Service

A TypeScript library that wraps the UPS Rating API behind a carrier-agnostic interface. Designed so adding a second carrier (FedEx, USPS, DHL) requires zero changes to existing code.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in UPS credentials
npm test                # run integration tests
npm run dev             # run CLI demo
```

## Architecture

```
Caller
  └─ ShippingService          validates input, delegates to provider
       └─ CarrierProvider     interface — getRates()
            └─ UpsProvider    implements CarrierProvider
                 ├─ UpsAuthManager   OAuth2 token lifecycle
                 ├─ mappers.ts       domain ↔ UPS format translation
                 └─ types.ts         raw UPS DTOs (never leak outside)
```

The key boundary is `mappers.ts` — it's the only file that knows UPS field names. Everything else works with carrier-agnostic domain types.

## Design Decisions

**Domain-first modeling** — `RateRequest`, `RateQuote`, `Address`, `Parcel` are pure business types. No UPS field names (`RatedShipment`, `MonetaryValue`, `Service.Code`) appear outside `src/carriers/ups/`.

**Zod for validation** — Schemas are the single source of truth for both TypeScript types and runtime validation. Input is validated in `ShippingService` before any HTTP call is made.

**Money as a value object** — Price and currency are bundled into a `Money` type to prevent accidental separation.

**Structured errors** — Five concrete error types (`AuthError`, `ValidationError`, `NetworkError`, `RateLimitedError`, `CarrierApiError`) let callers handle failures precisely without parsing error messages.

**Token caching** — `UpsAuthManager` caches OAuth tokens and refreshes 60 seconds before expiry to avoid edge-case failures.

## Project Structure

```
src/
  domain.ts              carrier-agnostic types + Zod schemas
  errors.ts              structured error hierarchy
  config.ts              env var validation
  CarrierProvider.ts     provider interface
  ShippingService.ts     main facade
  carriers/ups/
    types.ts             raw UPS API DTOs
    mappers.ts           domain ↔ UPS translation
    UpsAuthManager.ts    OAuth2 client-credentials flow
    UpsProvider.ts       implements CarrierProvider
  index.ts               public API exports
cli.ts                   runnable usage example
tests/
  fixtures/              realistic UPS response stubs
  integration/           end-to-end tests with nock
```

## Tests

Integration tests use `nock` to stub HTTP and cover:

- Input validation rejects bad requests before any HTTP call
- Successful rate response is normalized into `RateQuote[]`
- Request payload is correctly structured for UPS
- Auth token is cached and reused across calls
- 401 responses produce `AuthError`
- 429 responses produce `RateLimitedError`
- Connection failures produce `NetworkError`
- Server errors produce `CarrierApiError`

## Adding a New Carrier

1. Create `src/carriers/fedex/` with its own `types.ts`, `mappers.ts`, and provider
2. Implement `CarrierProvider` interface
3. Pass the new provider to `ShippingService` — no existing code changes

## What I Would Improve

- **Retry with backoff** for transient failures (429, 5xx, timeouts)
- **Request/response logging** with redacted credentials
- **Rate caching** to avoid redundant API calls for identical requests
- **Multi-carrier aggregation** — `ShippingService` accepting multiple providers and merging results
- **Pagination** for large multi-package shipments
