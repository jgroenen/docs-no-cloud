// ========================================================================
// Main Application Entry Point
// ========================================================================

import { state } from './state.js';
import { PRESENCE_INTERVAL } from './constants.js';
import { getDocumentId, showToast } from './utils.js';
import { syncEditorToYjs, syncYjsToEditor, broadcastUpdate } from './editor.js';
import { updateStatus } from './ui.js';
import { announcePresence, announceLeave, subscribeToPresence, subscribeToSignaling } from './nostr.js';
import { openFile, downloadAsHtml, downloadAsMarkdown } from './file-operations.js';
import { initToolbar, execCommand } from './toolbar.js';

// DOM elements
const editorEl = document.getElementById('editor');
const docIdEl = document.getElementById('docId');
const shareBtn = document.getElementById('shareBtn');
const openBtn = document.getElementById('openBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newDocBtn = document.getElementById('newDocBtn');

/**
 * Initialize the application
 */
async function init() {
  const documentId = getDocumentId();
  docIdEl.textContent = `#${documentId.slice(0, 8)}`;

  // Initialize Yjs
  const persistence = state.initYjs(documentId);

  persistence.on('synced', () => {
    console.log('[Local] Loaded from IndexedDB');
    syncYjsToEditor();
  });

  // Sync Yjs changes to editor
  state.yText.observe(() => {
    syncYjsToEditor();
  });

  // Broadcast updates to peers
  state.doc.on('update', broadcastUpdate);

  // Initialize Nostr
  state.initNostr();

  // Subscribe and announce
  subscribeToPresence();
  subscribeToSignaling();
  await announcePresence();

  // Presence heartbeat
  state.presenceTimer = setInterval(announcePresence, PRESENCE_INTERVAL);

  // Update UI
  updateStatus();
  editorEl.focus();

  console.log('[Init] Ready!');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Toolbar
  initToolbar();

  // Editor input
  editorEl.addEventListener('input', () => {
    syncEditorToYjs();
  });

  // Keyboard shortcuts
  editorEl.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); execCommand('bold'); break;
        case 'i': e.preventDefault(); execCommand('italic'); break;
        case 'u': e.preventDefault(); execCommand('underline'); break;
      }
    }
  });

  // Share button
  shareBtn.addEventListener('click', async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link gekopieerd!');
    } catch (e) {
      showToast('Kopiëren mislukt');
    }
  });

  // Open button
  openBtn.addEventListener('click', openFile);

  // Download button (with menu)
  downloadBtn.addEventListener('click', () => {
    const rect = downloadBtn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 5}px;
      left: ${rect.left}px;
      background: white;
      border: 1px solid var(--border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 1000;
      min-width: 150px;
    `;

    menu.innerHTML = `
      <button class="download-option" data-format="html" style="display: block; width: 100%; padding: 8px 12px; border: none; background: none; text-align: left; cursor: pointer; font-size: 13px; border-radius: 6px 6px 0 0;">
        📄 HTML bestand
      </button>
      <button class="download-option" data-format="md" style="display: block; width: 100%; padding: 8px 12px; border: none; background: none; text-align: left; cursor: pointer; font-size: 13px; border-radius: 0 0 6px 6px;">
        📝 Markdown bestand
      </button>
    `;

    menu.querySelectorAll('.download-option').forEach(btn => {
      btn.addEventListener('mouseover', () => btn.style.background = 'var(--bg)');
      btn.addEventListener('mouseout', () => btn.style.background = 'none');
      btn.addEventListener('click', () => {
        if (btn.dataset.format === 'html') {
          downloadAsHtml();
        } else {
          downloadAsMarkdown();
        }
        menu.remove();
      });
    });

    document.body.appendChild(menu);

    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  });

  // New document button
  newDocBtn.addEventListener('click', () => {
    const newId = crypto.randomUUID().replace(/-/g, '');
    window.location.hash = newId;
    window.location.reload();
  });

  // Handle hash changes (navigation between documents)
  window.addEventListener('hashchange', () => {
    window.location.reload();
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    announceLeave();
    state.cleanup();
  });
}

// Start the application
setupEventListeners();
init().catch(console.error);
