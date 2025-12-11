// ========================================================================
// UI Updates
// ========================================================================

import { state } from './state.js';

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const peersAvatars = document.getElementById('peersAvatars');

const AVATAR_COLORS = ['#e91e63', '#9c27b0', '#3f51b5', '#009688', '#ff5722', '#795548'];

/**
 * Update connection status indicator
 */
export function updateStatus() {
  const connectedCount = Array.from(state.peers.values()).filter(p => p.connected).length;

  if (connectedCount === 0) {
    statusDot.className = 'status-dot';
    statusText.textContent = 'Alleen jij';
  } else {
    statusDot.className = 'status-dot connected';
    statusText.textContent = `${connectedCount + 1} gebruikers`;
  }

  updateAvatars();
}

/**
 * Update peer avatars display
 */
function updateAvatars() {
  peersAvatars.innerHTML = '';

  Array.from(state.peers.values())
    .filter(p => p.connected)
    .slice(0, 5)
    .forEach((peer, i) => {
      const avatar = document.createElement('div');
      avatar.className = 'peer-avatar';
      avatar.style.background = AVATAR_COLORS[i % AVATAR_COLORS.length];
      avatar.textContent = peer.pubkey.slice(0, 2).toUpperCase();
      peersAvatars.appendChild(avatar);
    });
}

/**
 * Set status to "connecting"
 */
export function setConnecting() {
  statusDot.className = 'status-dot connecting';
}
