// ========================================================================
// Toolbar Actions
// ========================================================================

const editorEl = document.getElementById('editor');

/**
 * Execute a formatting command
 */
export function execCommand(action) {
  editorEl.focus();

  switch (action) {
    case 'bold':
      document.execCommand('bold');
      break;
    case 'italic':
      document.execCommand('italic');
      break;
    case 'underline':
      document.execCommand('underline');
      break;
    case 'h1':
      document.execCommand('formatBlock', false, 'h1');
      break;
    case 'h2':
      document.execCommand('formatBlock', false, 'h2');
      break;
    case 'h3':
      document.execCommand('formatBlock', false, 'h3');
      break;
    case 'p':
      document.execCommand('formatBlock', false, 'p');
      break;
    case 'ul':
      document.execCommand('insertUnorderedList');
      break;
    case 'ol':
      document.execCommand('insertOrderedList');
      break;
    case 'quote':
      document.execCommand('formatBlock', false, 'blockquote');
      break;
    case 'code':
      document.execCommand('formatBlock', false, 'pre');
      break;
  }
}

/**
 * Initialize toolbar buttons
 */
export function initToolbar() {
  document.querySelectorAll('.toolbar-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      execCommand(btn.dataset.action);
    });
  });
}
