let initialized = false;

export async function initNostrLogin() {
  if (initialized) {
    console.log('✅ nostr-login already initialized');
    return;
  }

  try {
    // Clear any old nostr-login data that might be corrupted
    if (typeof window !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('nostr-login') || key.startsWith('nl-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        console.log('🧹 Clearing old nostr-login data:', key);
        localStorage.removeItem(key);
      });
    }

    const { init } = await import('nostr-login');
    init({
      bunkers: 'nsec.app,nsecbunker.com',
      theme: 'default',
      darkMode: typeof window !== 'undefined' && document.documentElement.classList.contains('dark'),
    });
    initialized = true;
    console.log('✅ nostr-login initialized');
  } catch (error) {
    console.error('❌ Failed to initialize nostr-login:', error);
  }
}
