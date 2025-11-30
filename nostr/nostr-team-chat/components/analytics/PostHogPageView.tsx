'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { posthog } from '@/lib/providers/posthog-provider';

function PostHogPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

// Wrap in Suspense because useSearchParams() needs it
export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewTracker />
    </Suspense>
  );
}
