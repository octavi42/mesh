'use client';

import { useEffect, useState } from 'react';
import { validateEnv, initEnvValidation } from '@/lib/utils/env-validation';

interface EnvCheckProps {
  children: React.ReactNode;
}

/**
 * Component that validates environment variables on mount.
 * Shows an error screen if required variables are missing.
 */
export function EnvCheck({ children }: EnvCheckProps) {
  const [isValid, setIsValid] = useState(true);
  const [missing, setMissing] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Initialize validation logging
    initEnvValidation();

    // Check if env is valid
    const result = validateEnv();
    setIsValid(result.isValid);
    setMissing(result.missing);
    setChecked(true);
  }, []);

  // Don't render anything until we've checked
  if (!checked) {
    return null;
  }

  // Show error screen for missing required env vars
  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Configuration Error
            </h1>
          </div>

          <p className="text-zinc-400 mb-4">
            The application is missing required configuration. Please add the
            following environment variables to your <code className="text-indigo-400">.env.local</code> file:
          </p>

          <div className="bg-zinc-800 rounded-md p-4 mb-4">
            <ul className="space-y-2">
              {missing.map((envVar) => (
                <li key={envVar} className="flex items-center gap-2">
                  <span className="text-red-400">✗</span>
                  <code className="text-sm text-zinc-300">{envVar}</code>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm text-zinc-500">
            <p className="mb-2">Example configuration:</p>
            <pre className="bg-zinc-800 rounded p-3 overflow-x-auto text-xs text-zinc-400">
{missing.map((envVar) => {
  if (envVar === 'NEXT_PUBLIC_NIP29_RELAY_URL') {
    return `${envVar}=wss://your-relay.example.com`;
  }
  return `${envVar}=your-value-here`;
}).join('\n')}
            </pre>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              After adding the environment variables, restart the development server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
