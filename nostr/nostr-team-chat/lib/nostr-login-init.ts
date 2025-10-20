let initialized = false;

export async function initNostrLogin() {
  if (initialized) {
    console.log('✅ nostr-login already initialized');
    return;
  }

  try {
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
