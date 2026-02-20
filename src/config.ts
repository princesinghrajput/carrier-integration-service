import { z } from 'zod';

const UpsConfigSchema = z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    baseUrl: z.string().url(),
    tokenUrl: z.string().url(),
});

export type UpsConfig = z.infer<typeof UpsConfigSchema>;

// Fail fast at startup if any required env var is missing or invalid
export function loadUpsConfig(): UpsConfig {
    const result = UpsConfigSchema.safeParse({
        clientId: process.env.UPS_CLIENT_ID,
        clientSecret: process.env.UPS_CLIENT_SECRET,
        baseUrl: process.env.UPS_BASE_URL,
        tokenUrl: process.env.UPS_TOKEN_URL,
    });

    if (!result.success) {
        const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
        throw new Error(`Invalid UPS configuration: ${missing}`);
    }

    return result.data;
}
