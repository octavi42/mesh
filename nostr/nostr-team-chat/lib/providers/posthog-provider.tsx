'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

// PostHog configuration
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Initialize PostHog only on client-side and if key is provided
if (typeof window !== 'undefined' && POSTHOG_KEY) {
  console.log('📊 PostHog: Initializing with key:', POSTHOG_KEY.substring(0, 10) + '...');
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Capture pageviews automatically
    capture_pageview: false, // We'll handle this manually for better SPA support
    // Capture pageleaves for session recording
    capture_pageleave: true,
    // Disable in development unless explicitly enabled
    loaded: (posthog) => {
      console.log('📊 PostHog: Loaded successfully!');
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 PostHog: Running in development mode');
        // Optionally disable in development
        // posthog.opt_out_capturing();
      }
    },
    // Privacy-friendly defaults
    persistence: 'localStorage+cookie',
    // Don't track sensitive data
    sanitize_properties: (properties) => {
      // Remove any potentially sensitive data from events
      const sanitized = { ...properties };
      // Remove any auth tokens or private keys that might accidentally be captured
      if (sanitized.$current_url) {
        // Remove any sensitive query params
        try {
          const url = new URL(sanitized.$current_url);
          url.searchParams.delete('token');
          url.searchParams.delete('key');
          url.searchParams.delete('nsec');
          sanitized.$current_url = url.toString();
        } catch {
          // Ignore URL parsing errors
        }
      }
      return sanitized;
    },
  });
}

// Page view tracker component
function PostHogPageView() {
  useEffect(() => {
    if (POSTHOG_KEY && typeof window !== 'undefined') {
      // Track page view on route change
      posthog.capture('$pageview', {
        $current_url: window.location.href,
      });
    }
  }, []);

  return null;
}

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  // If no PostHog key, just render children without the provider
  if (!POSTHOG_KEY) {
    console.log('📊 PostHog: No key provided, skipping initialization');
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}

// Export posthog instance for manual event tracking
export { posthog };

// Helper functions for common tracking events
export const analytics = {
  // Track user identification (call after login)
  identify: (userId: string, properties?: Record<string, any>) => {
    if (POSTHOG_KEY) {
      posthog.identify(userId, properties);
    }
  },

  // Reset user (call on logout)
  reset: () => {
    if (POSTHOG_KEY) {
      posthog.reset();
    }
  },

  // Track custom events
  track: (eventName: string, properties?: Record<string, any>) => {
    if (POSTHOG_KEY) {
      posthog.capture(eventName, properties);
    }
  },

  // Track workspace events
  workspaceCreated: (workspaceId: string, workspaceName: string) => {
    analytics.track('workspace_created', { workspaceId, workspaceName });
  },

  workspaceJoined: (workspaceId: string) => {
    analytics.track('workspace_joined', { workspaceId });
  },

  // Track channel events
  channelCreated: (workspaceId: string, channelId: string, channelName: string) => {
    analytics.track('channel_created', { workspaceId, channelId, channelName });
  },

  // Track message events
  messageSent: (workspaceId: string, channelId: string) => {
    analytics.track('message_sent', { workspaceId, channelId });
  },

  // Track invite events
  inviteSent: (workspaceId: string) => {
    analytics.track('invite_sent', { workspaceId });
  },

  inviteAccepted: (workspaceId: string) => {
    analytics.track('invite_accepted', { workspaceId });
  },

  // Track auth events
  loginStarted: (method: string) => {
    analytics.track('login_started', { method });
  },

  loginCompleted: (method: string) => {
    analytics.track('login_completed', { method });
  },

  logoutCompleted: () => {
    analytics.track('logout_completed');
  },
};
