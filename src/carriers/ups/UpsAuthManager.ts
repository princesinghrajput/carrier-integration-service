import axios from 'axios';
import type { UpsConfig } from '../../config.js';
import type { UpsTokenResponse } from './types.js';
import { AuthError } from '../../errors.js';

// Handles UPS OAuth2 client-credentials flow.
// Tokens are cached in memory and refreshed automatically before expiry.
export class UpsAuthManager {
    private config: UpsConfig;
    private token: string | null = null;
    private expiresAt: number = 0;
    // Prevents duplicate token requests when multiple getRates() calls happen at once
    private inFlightRequest: Promise<string> | null = null;

    constructor(config: UpsConfig) {
        this.config = config;
    }

    async getToken(): Promise<string> {
        if (this.token && Date.now() < this.expiresAt) {
            return this.token;
        }

        // If a fetch is already in progress, wait on that same promise
        if (this.inFlightRequest) {
            return this.inFlightRequest;
        }

        this.inFlightRequest = this.fetchToken().finally(() => {
            this.inFlightRequest = null;
        });

        return this.inFlightRequest;
    }

    private async fetchToken(): Promise<string> {
        try {
            const response = await axios.post<UpsTokenResponse>(
                this.config.tokenUrl,
                'grant_type=client_credentials',
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    auth: {
                        username: this.config.clientId,
                        password: this.config.clientSecret,
                    },
                    timeout: 10_000,
                },
            );

            this.token = response.data.access_token;
            // Refresh 60 seconds early to avoid edge-case expiry
            this.expiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

            return this.token;
        } catch (error) {
            // Clear cached token so next call triggers a fresh request
            this.token = null;
            this.expiresAt = 0;

            if (axios.isAxiosError(error)) {
                throw new AuthError('Failed to obtain UPS access token', {
                    status: error.response?.status,
                    data: error.response?.data,
                });
            }

            throw new AuthError('Unexpected error during UPS authentication');
        }
    }
}
