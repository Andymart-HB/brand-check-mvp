// Simple sanitizer - in production, use DOMPurify
export function sanitize(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  const sanitized = div.innerHTML;
  
  // Allow specific tags and attributes
  const allowedTags = ['strong', 'br', 'span', 'div'];
  const allowedAttrs = ['class', 'style', 'data-severity'];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');
  
  // Remove script tags and event handlers
  doc.querySelectorAll('script, link, style').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    // Remove event handlers
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on') || !allowedAttrs.includes(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  return doc.body.innerHTML;
}