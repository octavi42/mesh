# Migration Guide: Nostr Team Chat Improvements

This guide will help you migrate from the old architecture to the new, improved system based on the groups_relay patterns.

## Overview of Changes

We've completely refactored the data fetching, state management, and error handling to create a more reliable and maintainable application.

### Key Improvements

1. **Fixed Session Management** - Replaced global flags with proper per-user caching
2. **Unified Data Management** - Single DataManager handles all Nostr operations
3. **Proper Subscription Cleanup** - SubscriptionManager prevents memory leaks
4. **Consolidated Stores** - Single workspace store replaces duplicate stores
5. **Comprehensive Error Handling** - Structured error types with recovery strategies
6. **Optimized Message Loading** - Pagination and virtual scrolling support
7. **Better Loading States** - Comprehensive UI feedback system

## Migration Steps

### Step 1: Install Required Dependencies

Make sure you have the required Zustand middleware:

```bash
npm install zustand immer
```

### Step 2: Replace Old Components

#### Update Layout Files

Replace the current layout imports:

```typescript
// OLD - Remove these imports
import { useNIP29Workspaces } from '@/lib/hooks/use-nip29-workspaces';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useWorkspaceStore as useWorkspaceStoreClean } from '@/lib/stores/workspace-store-clean';

// NEW - Use these imports
import { useWorkspaceStore } from '@/lib/stores/workspace-store-unified';
import { DataManager } from '@/lib/data/data-manager';
import { useErrorHandler } from '@/lib/hooks/use-error-handling';
```

#### Update App Layout (app/app/layout.tsx)

```typescript
// OLD
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, hasHydrated } = useAuthStore();
  const { isInitialized, isInitializing, error } = useAppInitialization();

  // Remove this line - causes session issues
  useNIP29Workspaces();

  // ... rest of component
}

// NEW
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, hasHydrated } = useAuthStore();
  const { initializeManagers, loading: workspaceLoading, error } = useWorkspaceStore();

  useEffect(() => {
    if (isAuthenticated && hasHydrated) {
      const { pubkey } = useAuthStore.getState();
      if (pubkey) {
        initializeManagers(pubkey);
      }
    }
  }, [isAuthenticated, hasHydrated]);

  // ... rest of component with proper error boundaries
  return (
    <ErrorBoundary level="page">
      <AppLayout>{children}</AppLayout>
    </ErrorBoundary>
  );
}
```

#### Update Channel Pages

```typescript
// OLD - app/app/w/[workspaceId]/c/[channelId]/page.tsx
export default function ChannelPage() {
  const { messages, isLoading, sendMessage } = useChannelMessages(actualChannelId);

  // ... component logic
}

// NEW
export default function ChannelPage() {
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    error
  } = useMessagesOptimized({
    channelId: actualChannelId,
    enableLiveUpdates: true
  });

  const { handleError, retry } = useMessageErrorHandler(actualChannelId);

  return (
    <LoadingBoundary
      isLoading={loading}
      error={error}
      onRetry={retry}
    >
      <ChannelView
        messages={messages}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onSendMessage={sendMessage}
      />
    </LoadingBoundary>
  );
}
```

### Step 3: Update Components

#### Add Error Boundaries

Wrap your main components with error boundaries:

```typescript
// components/layout/AppLayout.tsx
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <ErrorBoundary level="section">
      <div className="flex h-screen w-full overflow-hidden">
        <ErrorBoundary level="component">
          <Sidebar />
        </ErrorBoundary>

        <main className="flex-1 overflow-hidden">
          <ErrorBoundary level="section">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}
```

#### Update Message Components

```typescript
// components/chat/MessageList.tsx
export function MessageList({ channelId }: { channelId: string }) {
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    error
  } = useMessagesOptimized({
    channelId,
    enableLiveUpdates: true,
    maxMessages: 500
  });

  return (
    <LoadingBoundary
      isLoading={loading && messages.length === 0}
      error={error}
      onRetry={() => window.location.reload()}
      emptyState={<EmptyChannelState />}
      isEmpty={!loading && messages.length === 0}
    >
      <VirtualizedMessageList
        messages={messages}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </LoadingBoundary>
  );
}
```

### Step 4: Clean Up Old Files

After testing the new system, remove these old files:

```bash
# Remove old workspace stores
rm lib/stores/workspace-store.ts
rm lib/stores/workspace-store-clean.ts

# Remove old hooks with issues
rm lib/hooks/use-nip29-workspaces.ts
rm lib/hooks/use-app-initialization.ts

# Remove old channel message hook
rm lib/hooks/use-channel-messages.ts
```

### Step 5: Update Provider Setup

Update your providers to include error handling:

```typescript
// app/providers.tsx
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AsyncErrorBoundary level="page">
      <NDKProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </NDKProvider>
    </AsyncErrorBoundary>
  );
}
```

### Step 6: Environment Variables

Make sure you have proper error reporting configured:

```env
# .env.local
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
NEXT_PUBLIC_LOG_LEVEL=info
```

## Testing the Migration

### 1. Test Basic Functionality

- [ ] Login works correctly
- [ ] Workspaces load properly
- [ ] Messages display and update in real-time
- [ ] Navigation between channels works
- [ ] Sending messages works

### 2. Test Error Scenarios

- [ ] Network disconnection handling
- [ ] Invalid workspace/channel URLs
- [ ] Message sending failures
- [ ] Relay connection issues

### 3. Test Performance

- [ ] Fast initial load
- [ ] Smooth scrolling with many messages
- [ ] Memory usage doesn't grow unbounded
- [ ] No memory leaks from subscriptions

### 4. Test Data Persistence

- [ ] Page refresh maintains state
- [ ] User switching clears previous data
- [ ] Cache invalidation works properly

## Rollback Plan

If you need to rollback:

1. Keep a backup of the old files before deletion
2. Revert the component changes
3. Restore the old hook usage
4. Clear localStorage to reset any cached data

```typescript
// Emergency rollback - clear all cached data
localStorage.clear();
indexedDB.deleteDatabase('workspace-store-unified');
```

## Performance Monitoring

After migration, monitor these metrics:

### Memory Usage
```typescript
// Check subscription counts
console.log('Active subscriptions:', dataManager.getStats().subscriptions);

// Check cache sizes
console.log('Cache stats:', dataManager.getStats());
```

### Error Rates
```typescript
// Monitor error frequency
window.addEventListener('error', (event) => {
  console.log('Global error:', event.error);
});
```

### Load Times
```typescript
// Measure load performance
console.time('workspace-load');
// ... load workspaces
console.timeEnd('workspace-load');
```

## Common Issues and Solutions

### Issue: "Store not initialized" errors
**Solution**: Ensure `initializeManagers()` is called after authentication

### Issue: Messages not loading
**Solution**: Check that channel ID format is correct (workspaceId-channelName)

### Issue: Memory leaks
**Solution**: Verify SubscriptionManager cleanup is working

### Issue: Stale data after refresh
**Solution**: Check cache invalidation logic in WorkspaceDataManager

### Issue: Error boundaries not catching errors
**Solution**: Make sure async operations use proper error handling hooks

## Support

If you encounter issues during migration:

1. Check the browser console for detailed error logs
2. Verify all old imports have been replaced
3. Test in incognito mode to rule out cached data issues
4. Check that all required dependencies are installed

The new system provides much better error reporting, so most issues should be clearly logged with actionable error messages.