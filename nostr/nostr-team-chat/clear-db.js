const { openDB } = require('idb');

(async () => {
  const dbName = 'NostrTeamChat';
  
  // Delete the database
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => {
      console.log('Database deleted successfully');
      resolve();
    };
    req.onerror = () => {
      console.log('Error deleting database');
      reject();
    };
  });
})();
