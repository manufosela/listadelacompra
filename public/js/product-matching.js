/**
 * Lógica pura de normalización y similitud de nombres de producto.
 *
 * Este módulo NO depende de Firebase ni del DOM, por lo que se puede importar y
 * testear directamente (a diferencia de db.js, que carga el SDK de Firebase por
 * CDN y no es cargable en Node/Vitest). db.js reexporta estas funciones.
 */

/**
 * Normaliza un nombre de producto para búsqueda y comparación:
 * minúsculas, sin acentos/diacríticos y sin espacios extra.
 * @param {string} name
 * @returns {string}
 */
export function normalizeProductName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/\s+/g, ' '); // Espacios múltiples a uno
}

/**
 * Calcula la similitud entre dos strings (0-1) combinando coincidencia de
 * palabras y prefijos. Ambos strings se normalizan antes de comparar.
 * @param {string} str1
 * @param {string} str2
 * @returns {number} 0 (nada) … 1 (idénticos tras normalizar)
 */
export function calculateSimilarity(str1, str2) {
  const a = normalizeProductName(str1);
  const b = normalizeProductName(str2);

  if (a === b) return 1;
  if (!a || !b) return 0;

  // Coincidencia exacta de inicio
  if (b.startsWith(a) || a.startsWith(b)) return 0.9;

  // Todas las palabras del query están en el producto
  const queryWords = a.split(' ').filter((w) => w.length > 1);
  const productWords = b.split(' ');
  const allWordsMatch = queryWords.every((qw) =>
    productWords.some((pw) => pw.includes(qw) || qw.includes(pw))
  );
  if (allWordsMatch && queryWords.length > 0) return 0.8;

  // Una palabra contiene a la otra
  if (b.includes(a) || a.includes(b)) return 0.7;

  // Coincidencia parcial de palabras
  const matchingWords = queryWords.filter((qw) =>
    productWords.some((pw) => pw.includes(qw) || qw.includes(pw))
  );
  if (matchingWords.length > 0) {
    return 0.5 * (matchingWords.length / queryWords.length);
  }

  return 0;
}
