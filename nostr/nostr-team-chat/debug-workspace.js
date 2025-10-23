// Run this in browser console to debug workspace issues
console.log('=== WORKSPACE DEBUG ===');

// Check localStorage
const chatStorage = JSON.parse(localStorage.getItem('chat-storage') || '{}');
const workspaceStorage = JSON.parse(localStorage.getItem('workspace-storage') || '{}');

console.log('Chat Storage:', chatStorage);
console.log('Workspace Storage:', workspaceStorage);

// Check IndexedDB
const request = indexedDB.open('nostr-team-chat', 1);
request.onsuccess = () => {
  const db = request.result;
  const transaction = db.transaction(['nip29Workspaces'], 'readonly');
  const store = transaction.objectStore('nip29Workspaces');
  const getAllRequest = store.getAll();
  
  getAllRequest.onsuccess = () => {
    console.log('IndexedDB Workspaces:', getAllRequest.result);
    
    if (getAllRequest.result.length === 0) {
      console.log('❌ NO WORKSPACES FOUND in IndexedDB');
      console.log('💡 Solution: Create a workspace first');
    } else {
      console.log('✅ Found workspaces:', getAllRequest.result.map(w => w.groupId));
    }
  };
};

console.log('Run this to check your workspace state');
