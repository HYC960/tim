
(async function fullDomainClear() {
  if (!window.__domain_data_cleared__) {
    // Clear localStorage & sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Clear cookies
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
    });

    // Clear Cache Storage (used in service workers / PWA)
    if ('caches' in window) {
      const names = await caches.keys();
      for (const name of names) {
        await caches.delete(name);
      }
    }

    // Clear IndexedDB
    if (window.indexedDB && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        await indexedDB.deleteDatabase(db.name);
      }
    }

    // Prevent infinite loop
    window.__domain_data_cleared__ = true;

    // Reload
    location.reload();
  }
})();

