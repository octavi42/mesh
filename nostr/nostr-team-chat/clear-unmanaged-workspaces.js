// Run this once to clear unmanaged workspaces from localStorage
// Usage: node clear-unmanaged-workspaces.js

console.log('🧹 Clearing unmanaged workspaces from localStorage...');

// Since we can't access localStorage in Node.js, this provides the code to run in browser console

const browserCode = `
// Run this in your browser console while on your app
(function() {
  console.log('🧹 Clearing unmanaged workspaces...');

  try {
    // Get current workspace data
    const storedData = localStorage.getItem('workspace-store-clean');
    if (!storedData) {
      console.log('✅ No workspace data found');
      return;
    }

    const data = JSON.parse(storedData);
    console.log('📊 Current workspaces:', data.state?.workspaces?.length || 0);

    // Clear all workspace data
    localStorage.removeItem('workspace-store-clean');
    console.log('✅ Cleared all workspace data from localStorage');
    console.log('🔄 Refresh the page to load only managed workspaces');

    // Optional: Refresh the page automatically
    // window.location.reload();

  } catch (error) {
    console.error('❌ Error clearing workspaces:', error);
  }
})();
`;

console.log('\n📋 Copy and paste this code into your browser console:\n');
console.log(browserCode);
console.log('\n💡 Or simply run: localStorage.removeItem("workspace-store-clean")');
console.log('Then refresh the page to load only managed workspaces.');