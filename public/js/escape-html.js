/**
 * Utilidad compartida para escapar texto que se va a interpolar en HTML.
 * Evita inyección de HTML/XSS cuando se construye markup con template literals
 * y se asigna vía innerHTML. Función pura (no depende del DOM), testeable en
 * cualquier entorno.
 *
 * @param {unknown} value - Valor a escapar (se convierte a string).
 * @returns {string} Texto con los caracteres peligrosos escapados.
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
