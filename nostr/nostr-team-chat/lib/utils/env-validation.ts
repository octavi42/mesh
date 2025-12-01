/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at startup to prevent
 * cryptic runtime errors in production.
 */

// Required environment variables (app won't work without these)
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_NIP29_RELAY_URL',
] as const;

// Optional but recommended environment variables
const RECOMMENDED_ENV_VARS = [
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_APP_URL',
] as const;

interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validates environment variables and returns the result
 */
export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      missing.push(envVar);
    }
  }

  // Check recommended variables
  for (const envVar of RECOMMENDED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      warnings.push(envVar);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validates environment on import and logs warnings/errors
 * Called automatically when this module is imported
 */
export function initEnvValidation(): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    return;
  }

  const result = validateEnv();

  // Log missing required variables as errors
  if (!result.isValid) {
    console.error(
      '❌ Missing required environment variables:',
      result.missing.join(', ')
    );
    console.error(
      'Please add these to your .env.local file. See .env.example for reference.'
    );
  }

  // Log missing recommended variables as warnings (only in development)
  if (result.warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ Missing recommended environment variables:',
      result.warnings.join(', ')
    );
    console.warn(
      'These are optional but recommended for full functionality.'
    );
  }
}

/**
 * Get a required environment variable or throw an error
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please add it to your .env.local file.`
    );
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

// Type-safe environment variable getters
export const env = {
  // Required
  get relayUrl(): string {
    return getRequiredEnv('NEXT_PUBLIC_NIP29_RELAY_URL');
  },

  // Optional with defaults
  get appName(): string {
    return getOptionalEnv('NEXT_PUBLIC_APP_NAME', 'Nostr Team Chat');
  },

  get appUrl(): string {
    return getOptionalEnv('NEXT_PUBLIC_APP_URL', 'https://localhost:3000');
  },

  get posthogKey(): string | undefined {
    return process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined;
  },

  get posthogHost(): string {
    return getOptionalEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
  },

  get logLevel(): string {
    return getOptionalEnv('NEXT_PUBLIC_LOG_LEVEL', 
      process.env.NODE_ENV === 'production' ? 'error' : 'debug'
    );
  },

  get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  },

  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
};
