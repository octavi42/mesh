import type { NostrCapabilities, AuthMethod } from './types';

export class CapabilityDetector {
  private static instance: CapabilityDetector;
  private capabilities: NostrCapabilities | null = null;

  static getInstance(): CapabilityDetector {
    if (!CapabilityDetector.instance) {
      CapabilityDetector.instance = new CapabilityDetector();
    }
    return CapabilityDetector.instance;
  }

  async detectCapabilities(): Promise<NostrCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const capabilities: NostrCapabilities = {
      hasExtension: false,
      supportsMobile: false,
      availableMethods: [],
    };

    // Check for browser extension (NIP-07)
    if (typeof window !== 'undefined' && window.nostr) {
      try {
        // Test if extension is actually functional
        await window.nostr.getPublicKey();
        capabilities.hasExtension = true;
        capabilities.extensionName = this.detectExtensionName();
        capabilities.availableMethods.push('extension');
      } catch (error) {
        // Extension exists but not functional (user needs to unlock, etc.)
        capabilities.hasExtension = true;
        capabilities.extensionName = this.detectExtensionName();
      }
    }

    // Check mobile environment
    capabilities.supportsMobile = this.isMobileEnvironment();
    if (capabilities.supportsMobile) {
      capabilities.availableMethods.push('mobile');
    }

    // Local keys are always available
    capabilities.availableMethods.push('local');

    // Remote signers are always available
    capabilities.availableMethods.push('remote');

    this.capabilities = capabilities;
    return capabilities;
  }

  private detectExtensionName(): string {
    if (typeof window === 'undefined') return 'unknown';

    // Try to detect specific extensions
    if (window.nostr) {
      // Check for nos2x
      if ('nos2x' in window) return 'nos2x';
      // Check for Alby
      if ('alby' in window) return 'Alby';
      // Generic extension
      return 'Browser Extension';
    }

    return 'unknown';
  }

  private isMobileEnvironment(): boolean {
    if (typeof window === 'undefined') return false;

    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  async waitForExtension(timeout = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      if (window.nostr) {
        resolve(true);
        return;
      }

      let timeoutId: NodeJS.Timeout;
      const checkInterval = setInterval(() => {
        if (window.nostr) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve(true);
        }
      }, 100);

      timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, timeout);
    });
  }

  getRecommendedMethod(capabilities: NostrCapabilities): AuthMethod {
    // Prioritize browser extension if available and functional
    if (capabilities.hasExtension) {
      return 'extension';
    }

    // Mobile users should use mobile-specific options
    if (capabilities.supportsMobile) {
      return 'mobile';
    }

    // Default to remote signer for best UX
    return 'remote';
  }

  reset(): void {
    this.capabilities = null;
  }
}