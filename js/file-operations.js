// ========================================================================
// File Operations (Open, Save, Export)
// ========================================================================

import { state } from './state.js';
import { showToast } from './utils.js';
import { syncYjsToEditor } from './editor.js';

const editorEl = document.getElementById('editor');

/**
 * Open file dialog
 */
export function openFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.html,.htm,.md,.markdown,.txt';
  input.onchange = handleFileOpen;
  input.click();
}

/**
 * Handle file open
 */
async function handleFileOpen(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const content = await file.text();
    let htmlContent = '';

    // Convert based on file type
    if (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown')) {
      htmlContent = markdownToHtml(content);
    } else if (file.name.toLowerCase().endsWith('.txt')) {
      htmlContent = textToHtml(content);
    } else {
      // HTML file - extract body content
      htmlContent = extractHtmlContent(content);
    }

    // Load into editor
    loadContentIntoEditor(htmlContent);
    showToast(`Bestand "${file.name}" geopend!`);
  } catch (error) {
    console.error('Error opening file:', error);
    showToast('Fout bij openen van bestand');
  }
}

/**
 * Convert Markdown to HTML (basic)
 */
function markdownToHtml(markdown) {
  return markdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<u>$1</u>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<') || match.trim() === '') return match;
      return `<p>${match}</p>`;
    })
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>.*<\/blockquote>)<\/p>/g, '$1')
    .replace(/<p>(<pre>.*<\/pre>)<\/p>/g, '$1')
    .replace(/<p>(<[uo]l>.*<\/[uo]l>)<\/p>/g, '$1');
}

/**
 * Convert plain text to HTML
 */
function textToHtml(text) {
  return text
    .split('\n')
    .map(line => line.trim() ? `<p>${line}</p>` : '')
    .join('');
}

/**
 * Extract content from HTML file
 */
function extractHtmlContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : html;
}

/**
 * Load content into editor via Yjs
 */
function loadContentIntoEditor(htmlContent) {
  state.doc.transact(() => {
    state.yText.delete(0, state.yText.length);
    state.yText.insert(0, htmlContent || '<p>Leeg document</p>');
  }, 'local');

  syncYjsToEditor();
  editorEl.focus();
}

/**
 * Download as HTML file
 */
export function downloadAsHtml() {
  const content = editorEl.innerHTML || '<p>Leeg document</p>';
  const htmlContent = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document ${state.documentId.slice(0, 8)}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 2em auto; padding: 1em; line-height: 1.6; }
    h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin-bottom: 1em; }
    ul, ol { margin-bottom: 1em; padding-left: 2em; }
    blockquote { border-left: 3px solid #ccc; margin: 1em 0; padding-left: 1em; color: #666; }
    pre { background: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
${content}
</body>
</html>`;

  downloadFile(`document-${state.documentId.slice(0, 8)}.html`, htmlContent, 'text/html');
  showToast('HTML bestand gedownload!');
}

/**
 * Download as Markdown file
 */
export function downloadAsMarkdown() {
  const content = editorEl.innerHTML || '';
  const markdown = htmlToMarkdown(content);

  downloadFile(`document-${state.documentId.slice(0, 8)}.md`, markdown, 'text/markdown');
  showToast('Markdown bestand gedownload!');
}

/**
 * Convert HTML to Markdown (basic)
 */
function htmlToMarkdown(html) {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Trigger file download
 */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
