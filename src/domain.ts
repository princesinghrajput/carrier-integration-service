import { z } from 'zod';

// All domain types are carrier-agnostic. No UPS/FedEx field names here.
// Zod schemas serve as both runtime validation and TypeScript type source.

export const WeightUnit = z.enum(['LBS', 'KGS']);
export type WeightUnit = z.infer<typeof WeightUnit>;

export const DimensionUnit = z.enum(['IN', 'CM']);
export type DimensionUnit = z.infer<typeof DimensionUnit>;

export const AddressSchema = z.object({
    name: z.string().optional(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    // Supports international addresses (2-3 char province codes like 'ON', 'QC')
    stateOrProvince: z.string().min(2).max(3),
    postalCode: z.string().min(1),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
});

export type Address = z.infer<typeof AddressSchema>;

export const WeightSchema = z.object({
    value: z.number().positive(),
    unit: WeightUnit,
});

export type Weight = z.infer<typeof WeightSchema>;

export const DimensionsSchema = z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    unit: DimensionUnit,
});

export type Dimensions = z.infer<typeof DimensionsSchema>;

export const ParcelSchema = z.object({
    weight: WeightSchema,
    dimensions: DimensionsSchema.optional(),
});

export type Parcel = z.infer<typeof ParcelSchema>;

// Price + currency bundled together so they can't be accidentally separated
export const MoneySchema = z.object({
    amount: z.number().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/),
});

export type Money = z.infer<typeof MoneySchema>;

export const RateRequestSchema = z.object({
    origin: AddressSchema,
    destination: AddressSchema,
    parcels: z.array(ParcelSchema).min(1),
});

export type RateRequest = z.infer<typeof RateRequestSchema>;

export const RateQuoteSchema = z.object({
    carrier: z.string(),
    serviceName: z.string(),
    serviceCode: z.string(),
    totalCharge: MoneySchema,
    transitDays: z.number().int().positive().optional(),
    guaranteedDelivery: z.boolean().optional(),
});

export type RateQuote = z.infer<typeof RateQuoteSchema>;
