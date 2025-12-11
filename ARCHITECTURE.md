# Docs P2P - Architecture Documentation

## Overview
Docs P2P is een volledig gedecentraliseerde collaborative text editor die werkt zonder centrale servers. De applicatie gebruikt een hybride architectuur waarbij Nostr wordt gebruikt voor peer discovery en WebRTC voor directe P2P document synchronisatie.

## Core Architecture

```
┌─────────────────┐    Nostr Protocol     ┌─────────────────┐
│     Client A    │◄──────discovery──────►│     Client B    │
│                 │                       │                 │
│  ┌───────────┐  │   WebRTC DataChannel  │  ┌───────────┐  │
│  │    Yjs    │◄─┼──────direct P2P──────►├─►│    Yjs    │  │
│  │   CRDT    │  │                       │  │   CRDT    │  │
│  └───────────┘  │                       │  └───────────┘  │
│                 │                       │                 │
│  IndexedDB      │                       │  IndexedDB      │
│  (local cache)  │                       │  (local cache)  │
└─────────────────┘                       └─────────────────┘
```

## Technology Stack

### Frontend Technologies
- **HTML5**: Single-page application structure
- **CSS3**: Responsive design with CSS Grid/Flexbox
- **Vanilla JavaScript (ES6+)**: No frameworks, modern JavaScript features

### Collaboration Technologies
- **Yjs v13.6.18**: Conflict-free collaborative editing via CRDT (Conflict-free Replicated Data Type)
- **IndexedDB**: Local document persistence via y-indexeddb
- **WebRTC**: Direct peer-to-peer data channels for real-time sync
- **Nostr Protocol**: Decentralized peer discovery and WebRTC signaling

### External Dependencies
```javascript
// CDN imports via ES modules
import * as Y from 'https://cdn.jsdelivr.net/npm/yjs@13.6.18/+esm'
import { IndexeddbPersistence } from 'https://cdn.jsdelivr.net/npm/y-indexeddb@9.0.12/+esm'
import * as nostrTools from 'https://cdn.jsdelivr.net/npm/nostr-tools@2.7.2/+esm'
```

## System Components

### 1. Document Layer (Yjs CRDT)
```javascript
// Core document state
let doc: Y.Doc              // Main Yjs document
let yText: Y.Text          // Collaborative text content
let localPersistence       // IndexedDB persistence provider
```

**Responsibilities:**
- Conflict-free document state management
- Local persistence to IndexedDB
- Automatic sync with remote peers
- Undo/redo operations

### 2. Network Layer

#### A. Peer Discovery (Nostr)
```javascript
// Nostr configuration
const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol', 
  'wss://relay.nostr.band'
]
const KIND_PRESENCE = 30078    // "I'm here" announcements
const KIND_WEBRTC_SIGNAL = 30079 // WebRTC signaling messages
```

**Responsibilities:**
- Announce presence to document rooms
- Discover other peers editing the same document
- Exchange WebRTC signaling data (offers, answers, ICE candidates)
- **NOT used for document synchronization**

#### B. P2P Communication (WebRTC)
```javascript
// WebRTC configuration
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]
const peerConnections = new Map() // pubkey -> {connection, dataChannel, connected}
```

**Responsibilities:**
- Direct peer-to-peer connections
- Real-time Yjs update synchronization
- Binary data channel communication
- Connection state management

### 3. UI Layer

#### A. Editor Interface
- **Rich text editing**: contenteditable with toolbar commands
- **Live status**: Connection status and peer count
- **Peer avatars**: Visual indication of connected collaborators
- **Document ID**: Shareable document identifier in URL hash

#### B. File Operations
- **Open files**: HTML, Markdown, and text file import
- **Save/Export**: Download as HTML or Markdown
- **New documents**: Generate random document IDs

## Data Flow

### 1. Document Initialization
```
1. Generate/extract document ID from URL hash
2. Create Yjs document and text provider
3. Set up IndexedDB persistence
4. Initialize Nostr identity and connection pool
5. Subscribe to document presence events
6. Announce own presence to peers
```

### 2. Peer Discovery Flow
```
User A opens document → Announces presence via Nostr
                     ↓
User B receives presence → Initiates WebRTC connection
                        ↓
WebRTC signaling via Nostr → Direct P2P connection established
                           ↓
Yjs state synchronization → Documents in sync
```

### 3. Real-time Collaboration
```
User types in editor → syncEditorToYjs() → Yjs doc.update
                                        ↓
broadcastUpdate() → WebRTC data channel → Remote peers
                                        ↓
Remote Yjs update → syncYjsToEditor() → Update remote editor
```

### 4. Connection Management
```javascript
// Connection lifecycle
initiatePeerConnection() → createPeerConnection() → setupDataChannel()
                        ↓
WebRTC offers/answers via Nostr → ICE candidates → Connected
                                ↓
peerConnections.set(pubkey, {connection, dataChannel, connected: true})
```

## Security Model

### Decentralized Identity
- **Nostr keypairs**: Each client generates ephemeral cryptographic identity
- **Public key**: Used as unique peer identifier
- **Private key**: Signs Nostr events for presence and signaling

### Communication Security
- **WebRTC signaling**: Encrypted via Nostr NIP-04 (private messages)
- **Document data**: Transmitted via encrypted WebRTC data channels
- **No central authority**: No servers store user data or documents

### Privacy Features
- **Ephemeral identity**: New keypair per session
- **Local-first**: Documents stored locally in browser
- **P2P only**: No data transmitted through central servers

## File Structure

### Single-file Architecture
```
index.html (1301 lines)
├── HTML structure (lines 1-505)
│   ├── CSS styling (responsive, dark-mode ready)
│   ├── Rich text editor interface  
│   ├── Toolbar and controls
│   └── Status indicators
└── JavaScript module (lines 506-1301)
    ├── Imports and configuration (506-565)
    ├── Utilities (566-620)
    ├── Yjs integration (621-720)
    ├── File operations (721-877)
    ├── Toolbar actions (878-984)
    ├── Nostr integration (985-1049)
    ├── WebRTC P2P (1050-1235)
    └── Initialization (1236-1301)
```

## Key Functions by Category

### Document Management
- `syncEditorToYjs()` - Push editor changes to Yjs
- `syncYjsToEditor()` - Apply Yjs changes to editor
- `broadcastUpdate()` - Send updates to P2P peers

### Network Operations
- `announcePresence()` - Broadcast availability via Nostr
- `initiatePeerConnection()` - Start WebRTC connection
- `createPeerConnection()` - Set up RTCPeerConnection
- `setupDataChannel()` - Configure data channel for Yjs

### File Operations
- `openFile()` / `handleFileOpen()` - Import documents
- `downloadAsHtml()` / `downloadAsMarkdown()` - Export documents
- `markdownToHtml()` - Format conversion

### UI Management
- `updateStatus()` - Connection status display
- `showToast()` - User notifications
- `execCommand()` - Rich text formatting

## Configuration

### Environment Variables
None - all configuration is hardcoded for simplicity.

### Nostr Relays
Currently uses 3 public relays for redundancy:
- relay.damus.io
- nos.lol  
- relay.nostr.band

### WebRTC STUN Servers
Uses Google's public STUN servers for NAT traversal.

## Known Limitations

1. **NAT Traversal**: Complex network setups may prevent direct P2P connections
2. **Relay Dependency**: Requires at least one working Nostr relay for peer discovery
3. **Browser Compatibility**: Modern browsers only (ES6+ modules, WebRTC support)
4. **Scale Limits**: Performance may degrade with many simultaneous peers
5. **No Conflict Resolution UI**: Yjs handles conflicts automatically but doesn't show merge details

## Development Notes

### Recent Cleanups (December 2025)
- Removed duplicate functions from multiple architecture iterations
- Consolidated WebRTC handling into single consistent implementation
- Eliminated old WebSocket-based sync code
- Simplified Nostr integration to discovery-only role

### Code Quality
- No external build tools - runs directly in browser
- Modern JavaScript with async/await patterns
- Consistent error handling and logging
- Clean separation of concerns between layers

This architecture enables a fully decentralized collaborative editing experience while maintaining simplicity and performance.