// Raw UPS API request/response shapes.
// These mirror the UPS Rating API JSON structure.
// They should never be used outside the carriers/ups/ folder.

export interface UpsRateRequest {
    RateRequest: {
        Request: {
            TransactionReference: { CustomerContext: string };
        };
        Shipment: {
            Shipper: UpsParty;
            ShipTo: UpsParty;
            ShipFrom: UpsParty;
            PickupType: { Code: string };
            Package: UpsPackage[];
        };
    };
}

export interface UpsParty {
    Name?: string;
    Address: {
        AddressLine: string[];
        City: string;
        StateProvinceCode: string;
        PostalCode: string;
        CountryCode: string;
    };
}

export interface UpsPackage {
    PackagingType: { Code: string };
    PackageWeight: {
        UnitOfMeasurement: { Code: string };
        Weight: string;
    };
    Dimensions?: {
        UnitOfMeasurement: { Code: string };
        Length: string;
        Width: string;
        Height: string;
    };
}

export interface UpsRateResponse {
    RateResponse: {
        RatedShipment: UpsRatedShipment[];
    };
}

export interface UpsRatedShipment {
    Service: { Code: string };
    TotalCharges: {
        CurrencyCode: string;
        MonetaryValue: string;
    };
    GuaranteedDelivery?: {
        BusinessDaysInTransit: string;
    };
}

export interface UpsTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}
