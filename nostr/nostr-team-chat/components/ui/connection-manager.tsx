'use client';

import { useState } from 'react';
import { useNDK } from '@/lib/hooks/use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export function ConnectionManager() {
  const { ndk, isConnected, attachSigner } = useNDK();
  const { pubkey } = useAuthStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStep, setConnectionStep] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [showRetry, setShowRetry] = useState(false);

  // Don't show if not authenticated
  if (!pubkey) return null;

  // Show minimal success message if already connected
  if (isConnected) {
    return (
      <div className="m-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-green-700 font-medium">✅ Connected to relay - messages should load automatically</span>
        </div>
      </div>
    );
  }

  // Show a simpler message if we have a signer but aren't connected yet
  if (ndk?.signer) {
    return (
      <div className="m-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
          <span className="text-blue-700 font-medium">🔄 Automatically connecting to relay...</span>
        </div>
      </div>
    );
  }

  const handleConnect = async (isRetry: boolean = false) => {
    if (!ndk || !pubkey) return;

    setIsConnecting(true);
    setError('');
    setShowRetry(false);

    if (!isRetry) {
      setRetryCount(0);
    }

    setConnectionStep('Preparing connection...');

    try {
      // Step 1: Check auth method and available signers
      const storedAuthMethod = localStorage.getItem('nostr-auth-method');
      const hasExtension = typeof window !== 'undefined' && window.nostr;

      // Detect nsec.app usage: no stored auth method but has window.nostr and we're not on nsec.app domain
      const isNsecApp = !storedAuthMethod && hasExtension && window.location.hostname !== 'nsec.app';
      const authMethod = isNsecApp ? 'nsec' : storedAuthMethod;

      console.log('🔍 Connection debug:', {
        storedAuthMethod,
        detectedAuthMethod: authMethod,
        isNsecApp,
        hasExtension,
        pubkey
      });

      // Decide which signer to use based on auth method
      let signer;
      let signerType;

      if (authMethod === 'extension' && hasExtension) {
        // Use extension (best for NIP-42)
        setConnectionStep('Using browser extension for connection...');
        const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
        signer = new NDKNip07Signer();
        signerType = 'extension';
      } else if (authMethod === 'nsec' && hasExtension) {
        // Use nsec.app (special handling required)
        setConnectionStep('🔐 Detected nsec.app - preparing for extended timeouts...');
        console.log('🔐 nsec.app detected - service worker may need time to wake up');

        // Give user time to switch to nsec.app tab
        await new Promise(resolve => setTimeout(resolve, 2000));

        setConnectionStep('Testing nsec.app responsiveness... (please keep tab active)');
        const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
        signer = new NDKNip07Signer();
        signerType = 'nsec.app';
      } else if (authMethod === 'nip46') {
        // Use NIP-46 (note: will have NIP-42 issues)
        setConnectionStep('Attempting NIP-46 connection (NIP-42 may fail)...');
        const bunkerToken = localStorage.getItem('nostr-bunker-token');
        if (!bunkerToken) {
          throw new Error('NIP-46 selected but no bunker token found');
        }
        const { NDKNip46Signer } = await import('@nostr-dev-kit/ndk');
        signer = new NDKNip46Signer(ndk, pubkey, bunkerToken);
        signerType = 'nip46';
      } else if (hasExtension) {
        // Default to extension if available
        setConnectionStep('Using browser extension (default)...');
        const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
        signer = new NDKNip07Signer();
        signerType = 'extension';
      } else {
        // Fall back to nsec.app popup
        setConnectionStep('Checking nsec.app status...');

        if (!window.nostr) {
          throw new Error('No key storage available. Please install Alby extension or open nsec.app');
        }

        const testTimeout = isRetry ? 15000 : 8000;
        setConnectionStep(`Testing nsec.app response... ${isRetry ? '(retry with longer timeout)' : ''}`);

        const testPubkey = await Promise.race([
          window.nostr.getPublicKey(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('nsec.app not responding - please ensure tab is active')), testTimeout)
          )
        ]);

        if (testPubkey !== pubkey) {
          throw new Error('nsec.app pubkey mismatch - please refresh nsec.app');
        }

        const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
        signer = new NDKNip07Signer();
        signerType = 'nsec.app';
      }

      setConnectionStep(`Using ${signerType} signer for relay connection...`);

      // Step 3: Test signing capability with longer timeout for retries
      // nsec.app requires much longer timeouts due to service worker wake-up
      const baseTimeout = isNsecApp ? 30000 : (isRetry ? 15000 : 8000);
      const signerTimeout = isRetry && isNsecApp ? 45000 : baseTimeout;

      setConnectionStep(`Testing signing capability... ${isNsecApp ? '(nsec.app: extended timeout)' : ''} ${isRetry ? '(retry)' : ''}`);

      const testUser = await Promise.race([
        signer.user(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Signer test timeout')), signerTimeout)
        )
      ]);

      console.log('✅ Signer test passed for user:', testUser.pubkey.slice(0, 8));

      // Step 4: Connect to relay with explicit user awareness
      setConnectionStep('Connecting to relay (this may prompt for permission)...');

      if (isRetry) {
        setConnectionStep('Retrying relay connection... (please grant permission when prompted)');
        // Longer delay for retries to give user time to prepare
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await attachSigner(signer);

      setConnectionStep('Connected successfully!');
      setRetryCount(0); // Reset retry count on success
      console.log('✅ Manual connection successful');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Manual connection failed:', errorMessage);

      // Determine if this is a retryable error
      const isRetryableError = errorMessage.includes('timeout') ||
                             errorMessage.includes('not responding') ||
                             errorMessage.includes('permission denied') ||
                             errorMessage.includes('Auth signing timeout');

      if (isRetryableError && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setShowRetry(true);
        setError(`${errorMessage} (attempt ${retryCount + 1}/3)`);
      } else {
        setError(errorMessage);
        setShowRetry(false);
      }

      setConnectionStep('');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetry = async () => {
    await handleConnect(true);
  };

  return (
    <div className="m-4 border border-amber-200 bg-amber-50 rounded-lg">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />

          <div className="flex-1">
            <div className="font-medium text-gray-900 mb-2">
              Manual Relay Connection
            </div>

            <div className="text-sm text-gray-700 mb-3">
              Auto-connection didn't work. You can manually connect to the relay if needed.
            </div>

            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-800">
                  <strong>Connection Failed:</strong> {error}
                </div>
                <div className="mt-2 text-xs text-red-600">
                  {error.includes('timeout') || error.includes('not responding') ? (
                    <div>
                      <strong>nsec.app Timeout:</strong> This usually happens when:
                      <ul className="list-disc ml-4 mt-1">
                        <li>nsec.app tab is not active/visible</li>
                        <li>Browser has blocked the permission prompt</li>
                        <li>nsec.app needs to be refreshed</li>
                      </ul>
                      Click the "Retry Connection" button to try again with longer timeouts.
                    </div>
                  ) : error.includes('permission') ? (
                    <div>
                      <strong>Permission Issue:</strong> Please grant permission when nsec.app prompts you. Make sure to allow signing requests from this domain.
                    </div>
                  ) : (
                    <div>
                      Make sure nsec.app tab is active and visible, then try again.
                    </div>
                  )}
                </div>
              </div>
            )}

            {connectionStep && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <RefreshCw className="inline w-4 h-4 mr-2 animate-spin" />
                  {connectionStep}
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3">
              <div className="text-sm text-blue-800">
                <strong>Before connecting:</strong>
                <ul className="list-disc ml-4 mt-1">
                  <li>Open nsec.app in a separate tab</li>
                  <li>Keep that tab active and visible</li>
                  <li>Be ready to grant permission when prompted</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleConnect(false)}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isConnecting ? 'Connecting...' : 'Manual Connect'}
              </Button>

              {showRetry && !isConnecting && (
                <Button
                  onClick={handleRetry}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Retry Connection ({3 - retryCount} left)
                </Button>
              )}

              <Button
                onClick={() => window.open('https://nsec.app', '_blank')}
                variant="outline"
              >
                Open nsec.app
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}