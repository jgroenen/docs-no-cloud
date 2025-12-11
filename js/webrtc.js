// ========================================================================
// WebRTC Peer Connection Management
// ========================================================================

import { state } from './state.js';
import { ICE_SERVERS, CONNECTION_TIMEOUT } from './constants.js';
import { showToast } from './utils.js';
import { updateStatus, setConnecting } from './ui.js';
import { handleDataChannelMessage, syncFullState } from './editor.js';
import { sendSignalingMessage } from './signaling.js';

/**
 * Initiate a WebRTC connection to a remote peer
 */
export async function initiatePeerConnection(remotePubkey) {
  if (state.peers.has(remotePubkey)) return;

  // Collision resolution: lower pubkey initiates
  if (state.pubkey > remotePubkey) {
    console.log(`[WebRTC] Waiting for ${remotePubkey.slice(0, 8)}... to initiate`);
    return;
  }

  console.log(`[WebRTC] Initiating connection to ${remotePubkey.slice(0, 8)}...`);
  setConnecting();

  const pc = createPeerConnection(remotePubkey);
  const dc = pc.createDataChannel('yjs', { ordered: true });
  setupDataChannel(remotePubkey, dc);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await sendSignalingMessage(remotePubkey, {
    type: 'offer',
    documentId: state.documentId,
    payload: offer,
  });
}

/**
 * Create a new RTCPeerConnection for a remote peer
 */
export function createPeerConnection(remotePubkey) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  const peer = {
    pubkey: remotePubkey,
    connection: pc,
    dataChannel: null,
    connected: false,
    startedAt: Date.now(),
    connectionTimeout: null,
  };
  state.peers.set(remotePubkey, peer);

  // Timeout: als we niet verbinden binnen CONNECTION_TIMEOUT, geef op
  peer.connectionTimeout = setTimeout(() => {
    if (!peer.connected) {
      console.log(`[WebRTC] Connection timeout for ${remotePubkey.slice(0, 8)}... - peer waarschijnlijk offline`);
      removePeer(remotePubkey);
    }
  }, CONNECTION_TIMEOUT);

  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      await sendSignalingMessage(remotePubkey, {
        type: 'ice-candidate',
        documentId: state.documentId,
        payload: event.candidate.toJSON(),
      });
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC] State with ${remotePubkey.slice(0, 8)}...: ${pc.connectionState}`);

    if (pc.connectionState === 'connected') {
      peer.connected = true;
      if (peer.connectionTimeout) {
        clearTimeout(peer.connectionTimeout);
        peer.connectionTimeout = null;
      }
      updateStatus();
      syncFullState(remotePubkey);
      showToast('Verbonden met medewerker!');
    } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      removePeer(remotePubkey);
    }
  };

  pc.ondatachannel = (event) => {
    setupDataChannel(remotePubkey, event.channel);
  };

  return pc;
}

/**
 * Handle incoming WebRTC offer
 */
export async function handleOffer(remotePubkey, offer) {
  let peer = state.peers.get(remotePubkey);

  if (!peer) {
    setConnecting();
    createPeerConnection(remotePubkey);
    peer = state.peers.get(remotePubkey);
  }

  await peer.connection.setRemoteDescription(offer);
  const answer = await peer.connection.createAnswer();
  await peer.connection.setLocalDescription(answer);

  await sendSignalingMessage(remotePubkey, {
    type: 'answer',
    documentId: state.documentId,
    payload: answer,
  });
}

/**
 * Handle incoming WebRTC answer
 */
export async function handleAnswer(remotePubkey, answer) {
  const peer = state.peers.get(remotePubkey);
  if (!peer) return;
  await peer.connection.setRemoteDescription(answer);
}

/**
 * Handle incoming ICE candidate
 */
export async function handleIceCandidate(remotePubkey, candidate) {
  const peer = state.peers.get(remotePubkey);
  if (!peer) return;
  await peer.connection.addIceCandidate(candidate);
}

/**
 * Setup data channel event handlers
 */
function setupDataChannel(remotePubkey, dc) {
  const peer = state.peers.get(remotePubkey);
  if (!peer) return;

  peer.dataChannel = dc;
  dc.binaryType = 'arraybuffer';

  dc.onopen = () => {
    console.log(`[WebRTC] Data channel open with ${remotePubkey.slice(0, 8)}...`);
    syncFullState(remotePubkey);
  };

  dc.onmessage = (event) => {
    handleDataChannelMessage(remotePubkey, event.data);
  };

  dc.onerror = (error) => {
    console.warn(`[WebRTC] Data channel error with ${remotePubkey.slice(0, 8)}...`, error);
  };

  dc.onclose = () => {
    console.log(`[WebRTC] Data channel closed with ${remotePubkey.slice(0, 8)}...`);
  };
}

/**
 * Remove a peer and cleanup resources
 */
export function removePeer(remotePubkey) {
  const peer = state.peers.get(remotePubkey);
  if (!peer) return;

  // Clear connection timeout
  if (peer.connectionTimeout) {
    clearTimeout(peer.connectionTimeout);
    peer.connectionTimeout = null;
  }

  try {
    peer.dataChannel?.close();
  } catch (e) { /* ignore */ }

  try {
    peer.connection?.close();
  } catch (e) { /* ignore */ }

  state.peers.delete(remotePubkey);
  updateStatus();
  console.log(`[WebRTC] Removed peer ${remotePubkey.slice(0, 8)}...`);
}
