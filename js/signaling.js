// ========================================================================
// Nostr Signaling - Message Sending
// ========================================================================

import { finalizeEvent, nip04 } from 'nostr-tools';
import { state } from './state.js';
import { DEFAULT_RELAYS, KIND_ENCRYPTED_DM } from './constants.js';

/**
 * Send a signaling message to a peer
 */
export async function sendSignalingMessage(targetPubkey, message) {
  try {
    const encrypted = await nip04.encrypt(state.secretKey, targetPubkey, JSON.stringify(message));

    const event = finalizeEvent({
      kind: KIND_ENCRYPTED_DM,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', targetPubkey]],
      content: encrypted,
    }, state.secretKey);

    await Promise.any(state.pool.publish(DEFAULT_RELAYS, event));
  } catch (e) {
    console.warn('[Nostr] Failed to send signaling message', e);
  }
}
