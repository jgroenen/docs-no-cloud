// ========================================================================
// Application State
// ========================================================================

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { SimplePool, generateSecretKey, getPublicKey } from 'nostr-tools';

class AppState {
  constructor() {
    // Yjs document
    this.doc = null;
    this.yText = null;
    this.localPersistence = null;
    
    // Document info
    this.documentId = null;
    this.sessionId = crypto.randomUUID();
    
    // Nostr
    this.pool = null;
    this.secretKey = null;
    this.pubkey = null;
    this.subscriptions = [];
    
    // Peers
    this.peers = new Map();
    
    // Timers
    this.presenceTimer = null;
    this.cleanupTimer = null;
  }

  initYjs(documentId) {
    this.documentId = documentId;
    this.doc = new Y.Doc();
    this.yText = this.doc.getText('content');
    this.localPersistence = new IndexeddbPersistence(`docs-p2p-${documentId}`, this.doc);
    return this.localPersistence;
  }

  initNostr() {
    this.pool = new SimplePool();
    this.secretKey = generateSecretKey();
    this.pubkey = getPublicKey(this.secretKey);
    console.log(`[Nostr] Local pubkey: ${this.pubkey.slice(0, 8)}...`);
    console.log(`[Nostr] Session ID: ${this.sessionId.slice(0, 8)}...`);
  }

  addSubscription(sub) {
    this.subscriptions.push(sub);
  }

  cleanup() {
    // Clear timers
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Close subscriptions
    this.subscriptions.forEach(sub => {
      try { sub.close(); } catch (e) { /* ignore */ }
    });
    this.subscriptions = [];

    // Close peer connections
    this.peers.forEach((peer, pubkey) => {
      try { peer.dataChannel?.close(); } catch (e) { /* ignore */ }
      try { peer.connection?.close(); } catch (e) { /* ignore */ }
      if (peer.connectionTimeout) {
        clearTimeout(peer.connectionTimeout);
      }
    });
    this.peers.clear();
  }
}

// Singleton instance
export const state = new AppState();

// Re-export Y for convenience
export { Y };
