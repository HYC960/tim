window.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(sessionStorage.getItem('user'));

  if (user && user.photoURL) {
    document.getElementById('userPic').src = user.photoURL;
    document.getElementById('dropdownPic').src = user.photoURL;

    const name = user.displayName || user.name || user.fullName || 'Unknown User';
    document.getElementById('userName').textContent = name;
    document.getElementById('userEmail').textContent = user.email || 'No email';
  }

  const profile = document.getElementById('userProfile');
  const dropdown = document.getElementById('userDropdown');

  profile.addEventListener('click', () => {
    dropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!profile.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  // Logout handler
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fullDomainClear(); // Call the cleanup function
    window.location.href = 'login.html'; // Redirect after cleanup
  });
});

// Define the cleanup function
async function fullDomainClear() {
  if (!window.__domain_data_cleared__) {
    try {
      // Clear localStorage & sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // Clear cookies
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });

      // Clear Cache Storage
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

      window.__domain_data_cleared__ = true;
    } catch (err) {
      console.error('Error clearing domain data:', err);
    }
  }
}
