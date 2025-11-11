// Test script to verify extension authentication works with NIP-42
// Run this in browser console after logging in

async function testExtensionAuth() {
  console.log('🔍 Testing extension authentication with NIP-42...');

  // Check if we have window.nostr
  if (!window.nostr) {
    console.error('❌ No window.nostr found - extension not installed or not injected');
    return false;
  }

  // Test 1: Get public key
  console.log('📡 Testing window.nostr.getPublicKey()...');
  try {
    const pubkey = await window.nostr.getPublicKey();
    console.log('✅ getPublicKey() successful:', pubkey.slice(0, 8));
  } catch (error) {
    console.error('❌ getPublicKey() failed:', error);
    return false;
  }

  // Test 2: Sign a simple event (simulates NIP-42 AUTH response)
  console.log('📡 Testing window.nostr.signEvent()...');
  const authEvent = {
    kind: 22242,
    tags: [
      ['relay', 'wss://groups.contextio.app'],
      ['challenge', 'test-challenge-' + Date.now()]
    ],
    content: '',
    created_at: Math.floor(Date.now() / 1000)
  };

  try {
    const signed = await window.nostr.signEvent(authEvent);
    console.log('✅ signEvent() successful for NIP-42 AUTH');
    console.log('✅ Event signature:', signed.sig.slice(0, 16));
    return true;
  } catch (error) {
    console.error('❌ signEvent() failed:', error);
    return false;
  }
}

// Export for use
window.testExtensionAuth = testExtensionAuth;

console.log('✅ Test script loaded. Run: testExtensionAuth()');
console.log('🔍 This will verify extension can handle NIP-42 AUTH challenges');
