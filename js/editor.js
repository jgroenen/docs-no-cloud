// ========================================================================
// Editor Sync (Yjs <-> DOM)
// ========================================================================

import { state, Y } from './state.js';

const editorEl = document.getElementById('editor');

/**
 * Sync editor content to Yjs document
 */
export function syncEditorToYjs() {
  if (!state.doc || !state.yText) return;
  
  const content = editorEl.innerHTML;
  state.doc.transact(() => {
    state.yText.delete(0, state.yText.length);
    state.yText.insert(0, content);
  }, 'local');
}

/**
 * Sync Yjs document to editor
 */
export function syncYjsToEditor() {
  if (!state.yText) return;
  
  const content = state.yText.toString();
  if (editorEl.innerHTML !== content) {
    // Save cursor position
    const sel = window.getSelection();
    let cursorOffset = 0;
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      cursorOffset = range.startOffset;
    }

    editorEl.innerHTML = content || '';

    // Restore cursor (simplified)
    if (content && sel.rangeCount > 0) {
      try {
        const range = document.createRange();
        const textNode = editorEl.firstChild;
        if (textNode) {
          range.setStart(textNode, Math.min(cursorOffset, textNode.length || 0));
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch (e) {
        // Cursor restore failed, ignore
      }
    }
  }
}

/**
 * Broadcast Yjs update to all connected peers
 */
export function broadcastUpdate(update, origin) {
  if (typeof origin === 'string' && origin !== 'local') return;

  const message = new Uint8Array(1 + update.length);
  message[0] = 0; // Message type: Yjs update
  message.set(update, 1);

  for (const peer of state.peers.values()) {
    if (peer.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(message);
    }
  }
}

/**
 * Handle incoming data channel message
 */
export function handleDataChannelMessage(remotePubkey, data) {
  const message = new Uint8Array(data);
  const messageType = message[0];
  const payload = message.slice(1);

  if (messageType === 0) {
    // Yjs update
    Y.applyUpdate(state.doc, payload, remotePubkey);
  }
}

/**
 * Sync full Yjs state to a specific peer
 */
export function syncFullState(remotePubkey) {
  const peer = state.peers.get(remotePubkey);
  if (!peer?.dataChannel || peer.dataChannel.readyState !== 'open') return;

  const update = Y.encodeStateAsUpdate(state.doc);
  const message = new Uint8Array(1 + update.length);
  message[0] = 0;
  message.set(update, 1);

  peer.dataChannel.send(message);
  console.log(`[WebRTC] Synced state to ${remotePubkey.slice(0, 8)}...`);
}
