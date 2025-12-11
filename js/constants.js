// ========================================================================
// Constants
// ========================================================================

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const KIND_PRESENCE = 30078;
export const KIND_ENCRYPTED_DM = 4;

// Timing constants
export const PRESENCE_INTERVAL = 20000;      // 20 seconden - heartbeat
export const PRESENCE_TIMEOUT = 60000;       // 60 seconden - peer timeout
export const CLEANUP_INTERVAL = 45000;       // 45 seconden - cleanup check
export const CONNECTION_TIMEOUT = 15000;     // 15 seconden - WebRTC timeout
export const MAX_MESSAGE_AGE = 30000;        // 30 seconden - max presence message age
