// ========================================================================
// Nostr Signaling & Presence
// ========================================================================

import { finalizeEvent, nip04 } from 'nostr-tools';
import { state } from './state.js';
import { DEFAULT_RELAYS, KIND_PRESENCE, KIND_ENCRYPTED_DM, MAX_MESSAGE_AGE } from './constants.js';
import { initiatePeerConnection, handleOffer, handleAnswer, handleIceCandidate } from './webrtc.js';
import { sendSignalingMessage } from './signaling.js';

// Re-export for convenience
export { sendSignalingMessage };

/**
 * Announce presence on the document
 */
export async function announcePresence() {
  const event = finalizeEvent({
    kind: KIND_PRESENCE,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', state.documentId],
      ['t', `doc-${state.documentId}`],
    ],
    content: JSON.stringify({
      type: 'join',
      documentId: state.documentId,
      pubkey: state.pubkey,
      sessionId: state.sessionId,
      timestamp: Date.now(),
    }),
  }, state.secretKey);

  try {
    await Promise.any(state.pool.publish(DEFAULT_RELAYS, event));
    console.log('[Nostr] Presence announced');
  } catch (e) {
    console.warn('[Nostr] Failed to announce presence', e);
  }
}

/**
 * Announce leaving the document (call on page unload)
 */
export async function announceLeave() {
  const event = finalizeEvent({
    kind: KIND_PRESENCE,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', state.documentId],
      ['t', `doc-${state.documentId}`],
    ],
    content: JSON.stringify({
      type: 'leave',
      documentId: state.documentId,
      pubkey: state.pubkey,
      sessionId: state.sessionId,
      timestamp: Date.now(),
    }),
  }, state.secretKey);

  try {
    // Use sendBeacon-style fire and forget
    state.pool.publish(DEFAULT_RELAYS, event);
  } catch (e) {
    // Ignore errors on leave
  }
}

/**
 * Subscribe to presence events for this document
 */
export function subscribeToPresence() {
  const filter = {
    kinds: [KIND_PRESENCE],
    '#d': [state.documentId],
    since: Math.floor(Date.now() / 1000) - 120,
  };

  const sub = state.pool.subscribeMany(DEFAULT_RELAYS, [filter], {
    onevent: (event) => handlePresenceEvent(event),
  });

  state.addSubscription({ close: () => sub.close() });
}

/**
 * Handle incoming presence event
 */
function handlePresenceEvent(event) {
  if (event.pubkey === state.pubkey) return;

  try {
    const presence = JSON.parse(event.content);

    // Filter oude presence berichten
    const messageAge = Date.now() - (presence.timestamp || 0);
    if (messageAge > MAX_MESSAGE_AGE) {
      console.log(`[Nostr] Ignoring old presence from ${event.pubkey.slice(0, 8)}... (${Math.round(messageAge / 1000)}s old)`);
      return;
    }

    if (presence.type === 'join' && !state.peers.has(event.pubkey)) {
      console.log(`[Nostr] Fresh peer discovered: ${event.pubkey.slice(0, 8)}... (${Math.round(messageAge / 1000)}s old)`);
      initiatePeerConnection(event.pubkey);
    } else if (presence.type === 'leave') {
      console.log(`[Nostr] Peer leaving: ${event.pubkey.slice(0, 8)}...`);
      // Could trigger peer removal here if needed
    }
  } catch (e) {
    console.warn('[Nostr] Invalid presence event');
  }
}

/**
 * Subscribe to signaling messages (WebRTC offers/answers/ICE)
 */
export function subscribeToSignaling() {
  const filter = {
    kinds: [KIND_ENCRYPTED_DM],
    '#p': [state.pubkey],
    since: Math.floor(Date.now() / 1000) - 120,
  };

  const sub = state.pool.subscribeMany(DEFAULT_RELAYS, [filter], {
    onevent: async (event) => {
      await handleSignalingEvent(event);
    },
  });

  state.addSubscription({ close: () => sub.close() });
}

/**
 * Handle incoming signaling event
 */
async function handleSignalingEvent(event) {
  if (event.pubkey === state.pubkey) return;

  try {
    const decrypted = await nip04.decrypt(state.secretKey, event.pubkey, event.content);
    const message = JSON.parse(decrypted);

    if (message.documentId !== state.documentId) return;

    console.log(`[Nostr] Received ${message.type} from ${event.pubkey.slice(0, 8)}...`);

    switch (message.type) {
      case 'offer':
        await handleOffer(event.pubkey, message.payload);
        break;
      case 'answer':
        await handleAnswer(event.pubkey, message.payload);
        break;
      case 'ice-candidate':
        await handleIceCandidate(event.pubkey, message.payload);
        break;
    }
  } catch (e) {
    console.warn('[Nostr] Failed to process signaling', e);
  }
}
