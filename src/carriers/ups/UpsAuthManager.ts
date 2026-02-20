import axios from 'axios';
import type { UpsConfig } from '../../config.js';
import type { UpsTokenResponse } from './types.js';
import { AuthError } from '../../errors.js';

export class UpsAuthManager {
    private config: UpsConfig;
    private token: string | null = null;
    private expiresAt: number = 0;

    constructor(config: UpsConfig) {
        this.config = config;
    }

    async getToken(): Promise<string> {
        if (this.token && Date.now() < this.expiresAt) {
            return this.token;
        }

        return this.fetchToken();
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
