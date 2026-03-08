/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize AI markdown response: escape HTML first, then apply safe formatting
 */
export function sanitizeMarkdown(text) {
    let safe = escapeHtml(text);
    // Bold
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Line breaks
    safe = safe.replace(/\n/g, '<br>');
    return safe;
}
