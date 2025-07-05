const overlay = document.getElementById('uploadOverlay');
let dragCounter = 0;

// ✅ Allowed MIME types (broad support)
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'text/plain',
  'application/json',
  'application/pdf',
  'text/html',
  'text/css',
  'application/javascript',
  'text/x-python',
  'text/markdown',
  'application/xml'
];

// ✅ Allowed extensions (in case MIME is missing or unknown)
const allowedExtensions = [
  'jpeg', 'jpg', 'png', 'txt', 'json', 'pdf',
  'py', 'html', 'css', 'js', 'ts', 'jsx', 'tsx',
  'md', 'xml', 'c', 'cpp', 'h', 'hpp', 'java',
  'cs', 'rb', 'php', 'sql', 'sh', 'bat', 'go',
  'rs', 'swift', 'kt', 'scala', 'dart'
];

function hasAllowedFiles(event) {
  const items = event.dataTransfer?.items;
  if (!items) return false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      const type = item.type;
      const name = file?.name || '';
      const ext = name.split('.').pop().toLowerCase();

      if (
        allowedMimeTypes.includes(type) ||
        allowedExtensions.includes(ext)
      ) {
        return true;
      }
    }
  }
  return false;
}

window.addEventListener('dragenter', (e) => {
  if (hasAllowedFiles(e)) {
    dragCounter++;
    overlay.style.display = 'flex';
  }
});

window.addEventListener('dragleave', (e) => {
  dragCounter--;
  if (dragCounter === 0) {
    overlay.style.display = 'none';
  }
});

window.addEventListener('drop', (e) => {
  dragCounter = 0;
  overlay.style.display = 'none';
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});
