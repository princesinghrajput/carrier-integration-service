import type { RateRequest, RateQuote } from '../../domain.js';
import type { UpsRateRequest, UpsRateResponse, UpsRatedShipment, UpsParty } from './types.js';

// UPS service code → human-readable name
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
        Name: address.name,
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
                Weight: parcel.weight.value.toString(),
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
                Package: packages,
            },
        },
    };
}

function mapRatedShipment(shipment: UpsRatedShipment): RateQuote {
    const code = shipment.Service.Code;

    return {
        carrier: 'UPS',
        serviceName: SERVICE_NAMES[code] ?? `UPS Service ${code}`,
        serviceCode: code,
        totalCharge: {
            amount: parseFloat(shipment.TotalCharges.MonetaryValue),
            currency: shipment.TotalCharges.CurrencyCode,
        },
        transitDays: shipment.GuaranteedDelivery
            ? parseInt(shipment.GuaranteedDelivery.BusinessDaysInTransit, 10)
            : undefined,
        guaranteedDelivery: !!shipment.GuaranteedDelivery,
    };
}

export function fromUpsRateResponse(response: UpsRateResponse): RateQuote[] {
    return response.RateResponse.RatedShipment.map(mapRatedShipment);
}
