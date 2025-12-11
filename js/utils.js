// ========================================================================
// Utility Functions
// ========================================================================

/**
 * Get or generate document ID from URL hash
 */
export function getDocumentId() {
  let id = window.location.hash.slice(1);
  if (!id || id.length < 8) {
    id = crypto.randomUUID().replace(/-/g, '');
    window.location.hash = id;
  }
  return id;
}

/**
 * Show a toast notification
 */
export function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/**
 * Generate a color from a string (for avatars)
 */
export function generateColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

/**
 * Format a pubkey for display (first 8 chars)
 */
export function formatPubkey(pubkey) {
  return pubkey ? pubkey.slice(0, 8) : 'unknown';
}
