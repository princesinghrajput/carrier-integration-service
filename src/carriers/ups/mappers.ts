// This file is the translation boundary between our domain types and UPS API formats.
// All UPS-specific field names and logic live here so nothing else needs to know about them.

import type { RateRequest, RateQuote } from '../../domain.js';
import type { UpsRateRequest, UpsRateResponse, UpsRatedShipment, UpsParty } from './types.js';
import { CarrierApiError } from '../../errors.js';

// Maps UPS numeric service codes to readable names
// See: https://developer.ups.com/api/reference/rating
const SERVICE_NAMES: Record<string, string> = {
    '01': 'Next Day Air',
    '02': '2nd Day Air',
    '03': 'Ground',
    '07': 'Worldwide Express',
    '08': 'Worldwide Expedited',
    '11': 'Standard',
    '12': '3 Day Select',
    '13': 'Next Day Air Saver',
    '14': 'UPS Next Day Air Early',
    '54': 'Worldwide Express Plus',
    '59': '2nd Day Air A.M.',
    '65': 'Saver',
};

function mapAddressToUps(address: RateRequest['origin']): UpsParty {
    const lines = [address.addressLine1];
    if (address.addressLine2) lines.push(address.addressLine2);

    return {
        // UPS can reject empty Name fields, so we default to 'N/A' when not provided
        Name: address.name ?? 'N/A',
        Address: {
            AddressLine: lines,
            City: address.city,
            StateProvinceCode: address.stateOrProvince,
            PostalCode: address.postalCode,
            CountryCode: address.countryCode,
        },
    };
}

export function toUpsRateRequest(request: RateRequest): UpsRateRequest {
    const packages = request.parcels.map((parcel) => {
        const pkg: UpsRateRequest['RateRequest']['Shipment']['Package'][0] = {
            PackagingType: { Code: '02' }, // 02 = Customer Supplied Package
            PackageWeight: {
                UnitOfMeasurement: { Code: parcel.weight.unit },
                Weight: parcel.weight.value.toString(), // UPS requires string numeric fields
            },
        };

        if (parcel.dimensions) {
            pkg.Dimensions = {
                UnitOfMeasurement: { Code: parcel.dimensions.unit },
                Length: parcel.dimensions.length.toString(),
                Width: parcel.dimensions.width.toString(),
                Height: parcel.dimensions.height.toString(),
            };
        }

        return pkg;
    });

    return {
        RateRequest: {
            Request: {
                TransactionReference: { CustomerContext: 'Rating' },
            },
            Shipment: {
                Shipper: mapAddressToUps(request.origin),
                ShipTo: mapAddressToUps(request.destination),
                ShipFrom: mapAddressToUps(request.origin),
                PickupType: { Code: '01' }, // 01 = Daily Pickup
                Package: packages,
            },
        },
    };
}

function mapRatedShipment(shipment: UpsRatedShipment, carrierName: string): RateQuote {
    const code = shipment?.Service?.Code;
    if (!code) {
        throw new CarrierApiError('UPS shipment missing service code', { shipment });
    }

    // Guard against corrupted monetary values - parseFloat('abc') returns NaN
    const amount = parseFloat(shipment.TotalCharges.MonetaryValue);
    if (isNaN(amount)) {
        throw new CarrierApiError('Invalid monetary value from UPS', {
            value: shipment.TotalCharges.MonetaryValue,
        });
    }

    return {
        carrier: carrierName, // Injected from provider, not hardcoded
        serviceName: SERVICE_NAMES[code] ?? `UPS Service ${code}`,
        serviceCode: code,
        totalCharge: {
            amount,
            currency: shipment.TotalCharges.CurrencyCode,
        },
        ...(shipment.GuaranteedDelivery && {
            transitDays: parseInt(shipment.GuaranteedDelivery.BusinessDaysInTransit, 10),
        }),
    };
}

export function fromUpsRateResponse(response: UpsRateResponse, carrierName: string): RateQuote[] {
    // UPS can return 200 OK with an unexpected body structure, so we validate before mapping
    if (!response?.RateResponse?.RatedShipment) {
        throw new CarrierApiError('UPS returned an invalid rate response', {
            response,
        });
    }

    return response.RateResponse.RatedShipment.map((s) => mapRatedShipment(s, carrierName));
}
