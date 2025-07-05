import { db, ref, set, onValue, remove } from '../../core/firebase-config.js';

const vaultBtn = document.getElementById("vaultBtn");
const vaultCloseBtn = document.getElementById("upload-closeBtn");
const vaultPopup = document.getElementById("upload-popup");
const vaultBrowseBtn = document.getElementById("upload-browseBtn");
const vaultFileInput = document.getElementById("upload-fileInput");
const vaultDropZone = document.getElementById("upload-dropZone");
const vaultFileList = document.getElementById("upload-fileList");
const submitBtn = document.getElementById("upload-submitBtn");

const vaultUploadedFiles = new Set();

const allowedTypes = [
  "text/plain", "application/javascript", "text/html",
  "text/css", "application/json", "text/x-python"
];
const allowedExtensions = /\.(txt|html|css|js|json|py)$/i;

let userEmail = null;

// ✅ Get User from Session
window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (user && user.email) {
    userEmail = user.email.replace(/\./g, "_"); // Firebase-safe email path
    fetchVaultFiles();
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }
});

// ✅ Open Popup
vaultBtn.addEventListener("click", () => {
  vaultPopup.style.display = "flex";
  fetchVaultFiles(); // Refresh
});

// ✅ Close Popup
vaultCloseBtn.addEventListener("click", () => {
  vaultPopup.style.display = "none";
  vaultFileList.innerHTML = "";
  vaultUploadedFiles.clear();
});

// ✅ Browse Button Click
vaultBrowseBtn.addEventListener("click", () => {
  vaultFileInput.click();
});

// ✅ File Input Change
vaultFileInput.addEventListener("change", (e) => {
  handleVaultFiles(e.target.files);
});

// ✅ Drag & Drop
vaultDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  vaultDropZone.classList.add("dragover");
});

vaultDropZone.addEventListener("dragleave", () => {
  vaultDropZone.classList.remove("dragover");
});

vaultDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  vaultDropZone.classList.remove("dragover");
  handleVaultFiles(e.dataTransfer.files);
});

// ✅ Handle File Rendering
function handleVaultFiles(files) {
  Array.from(files).forEach(file => {
    if (vaultUploadedFiles.has(file.name)) return;

    const fileDiv = document.createElement("div");
    const isTextFile = allowedTypes.includes(file.type) || allowedExtensions.test(file.name);

    if (isTextFile) {
      fileDiv.innerHTML = `<i class="fas fa-file-alt upload-valid"></i> <span class="upload-valid">${file.name}</span>`;
    } else {
      fileDiv.innerHTML = `<i class="fas fa-times-circle upload-error"></i> <span class="upload-error">${file.name}</span> (unsupported)`;
    }

    vaultFileList.appendChild(fileDiv);
    vaultUploadedFiles.add(file.name);
  });
}

// ✅ Submit to Firebase
submitBtn.addEventListener("click", () => {
  const files = vaultFileInput.files;
  if (!userEmail || files.length === 0) return;

  Array.from(files).forEach(file => {
    const isTextFile = allowedTypes.includes(file.type) || allowedExtensions.test(file.name);
    if (!isTextFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const safeFileName = file.name.replace(/[.#$/[\]]/g, "_");

      const fileRef = ref(db, `users/${userEmail}/filevault/${safeFileName}`);
      set(fileRef, {
        name: file.name,
        safeName: safeFileName,
        content,
        uploadedAt: new Date().toISOString()
      });
    };
    reader.readAsText(file);
  });

  alert("✅ Files uploaded successfully.");
  fetchVaultFiles();
});

// ✅ Fetch Files from Firebase
function fetchVaultFiles() {
  if (!userEmail) return;
  const vaultRef = ref(db, `users/${userEmail}/filevault`);

  onValue(vaultRef, (snapshot) => {
    vaultFileList.innerHTML = "";
    vaultUploadedFiles.clear();

    if (!snapshot.exists()) return;

    const files = snapshot.val();
    for (const fileKey in files) {
      const fileData = files[fileKey];
      vaultUploadedFiles.add(fileData.name);

      const fileDiv = document.createElement("div");
      fileDiv.innerHTML = `
        <i class="fas fa-file-alt upload-valid"></i>
        <span class="upload-valid">${fileData.name}</span>
        <button class="delete-btn" data-name="${fileKey}" style="margin-left:auto;color:#dc2626;background:none;border:none;cursor:pointer;">🗑️</button>
      `;
      vaultFileList.appendChild(fileDiv);
    }

    // ✅ Delete Button
    vaultFileList.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const fileKey = btn.dataset.name;
        const delRef = ref(db, `users/${userEmail}/filevault/${fileKey}`);
        remove(delRef);
        alert(`🗑️ Deleted: ${fileKey}`);
      });
    });
  });
}
