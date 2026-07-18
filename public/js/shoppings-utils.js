/**
 * Helpers puros de las compras (sublistas), sin dependencias de Firebase.
 * Separados de shoppings.js para poder testearlos directamente (shoppings.js
 * carga el SDK de Firebase por CDN y no es cargable en Node/Vitest).
 */

/**
 * Devuelve el id (yyyymmdd) de la compra de un día. Por defecto, hoy.
 * @param {Date} [date]
 * @returns {string}
 */
export function getTodayShoppingId(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Nombre legible de una compra: "<lista> · yyyy-mm-dd".
 * @param {string} masterName
 * @param {string} dateId - yyyymmdd
 * @returns {string}
 */
export function getShoppingName(masterName, dateId) {
  const pretty = `${dateId.slice(0, 4)}-${dateId.slice(4, 6)}-${dateId.slice(6, 8)}`;
  return `${masterName || 'Compra'} · ${pretty}`;
}

/**
 * Selecciona los items de la lista maestra que deben migrar a la primera compra:
 * los que están SIN marcar (checked !== true) y no son sublistas/checklists.
 * En el uso del usuario, "sin marcar" = lo que iba a comprar.
 * @param {Array} items
 * @returns {Array}
 */
export function selectItemsToMigrate(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((i) => i && i.checked !== true && !i.isChecklist);
}
