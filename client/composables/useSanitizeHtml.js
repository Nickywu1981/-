/**
 * HTML 安全净化 composable — 防 XSS
 */
import DOMPurify from 'dompurify';

export function useSanitizeHtml() {
  function sanitize(dirty) {
    if (!dirty || typeof dirty !== 'string') return '';
    if (import.meta.server) {
      // SSR: strip all tags as fallback (DOMPurify needs DOM)
      return dirty.replace(/<[^>]*>/g, '');
    }
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }

  return { sanitize };
}
