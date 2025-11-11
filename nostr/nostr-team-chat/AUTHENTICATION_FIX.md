# Authentication Fix: Multiple AuthProvider Issue

## Problem Identified

The issue was caused by **multiple AuthProvider instances** being mounted simultaneously, each trying to initialize nostr-login independently, which caused:

1. ✅ First instance: Successful authentication
2. 🚀 Second instance: Mounts and tries to initialize nostr-login
3. ❌ Error: "Already started" from nostr-login
4. 🚪 This triggered a logout event cascade
5. 🔀 User gets logged out and redirected

## Root Cause

From the logs, we can see multiple AuthProvider mounts:
- `🚀 AuthProvider mounted` appears multiple times
- `nostr login init error Error: Already started`
- `nostr-login auth {type: 'logout'}`

This happens due to:
- React StrictMode double-mounting components in development
- Navigation/routing causing remounts
- Layout structure causing multiple provider instances

## Solution Implemented

### 1. **Global Singleton Pattern**
```typescript
// Global flag to prevent multiple initializations
let isNostrLoginInitialized = false;
let nostrLoginPromise: Promise<void> | null = null;
```

### 2. **Instance-Level Protection**
```typescript
const hasInitialized = useRef(false);

// Prevent multiple initializations from the same component
if (hasInitialized.current) {
  console.log('🔄 AuthProvider already initialized in this instance, skipping');
  return;
}
```

### 3. **Initialization Queue Management**
- Only one initialization runs at a time
- Subsequent instances wait for the first one to complete
- Handles "Already started" errors gracefully

### 4. **Better Error Handling**
- Popup blocker detection in NostrLoginButton
- More informative error messages
- Graceful fallback when initialization fails

## Files Modified

1. **`lib/providers/auth-provider.tsx`** - Added singleton initialization pattern
2. **`components/auth/NostrLoginButton.tsx`** - Better popup handling and error feedback

## Expected Behavior Now

1. 🚀 Only the first AuthProvider instance initializes nostr-login
2. 📡 Subsequent instances wait or skip initialization
3. ✅ Authentication works without conflicts
4. 🔄 No more "Already started" errors
5. 🎯 No unexpected logouts during page navigation

## Testing

The fix prevents the initialization cascade that was causing unexpected logouts. Users should now be able to:

- ✅ Authenticate successfully via nsec.app
- ✅ Navigate to `/app` without being logged out
- ✅ Have their session persist across page refreshes
- ✅ Get helpful guidance if popups are blocked

## About:blank#blocked Issue

This typically occurs when:
1. Browser popup blocker prevents nsec.app from opening
2. The authentication window fails to open properly

**Solution**: The button now detects popup blocking and provides user guidance to manually visit nsec.app or allow popups.