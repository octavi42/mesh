// Clear existing workspace data to force reconnection to new relay
console.log('🧹 Clearing existing workspace data...');

if (typeof window !== 'undefined') {
  // Clear IndexedDB
  const deleteDB = indexedDB.deleteDatabase('NostrTeamChat');
  deleteDB.onsuccess = () => console.log('✅ IndexedDB cleared');
  deleteDB.onerror = () => console.error('❌ Failed to clear IndexedDB');

  // Clear localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('workspace') || key.includes('nostr') || key.includes('auth'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('🗑️ Removed:', key);
  });

  console.log('✅ All data cleared. Please refresh the page.');
} else {
  console.log('❌ This script must be run in the browser console');
}