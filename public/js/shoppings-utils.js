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

// ============================================
// Modelo v2: compra activa + histórico
// ============================================

/**
 * ¿El id de una compra es del modelo antiguo (yyyymmdd)? Se usan como histórico
 * legacy: no tienen `status` ni las apunta `activeShoppingId`.
 * @param {string} id
 * @returns {boolean}
 */
export function isLegacyShoppingId(id) {
  return typeof id === 'string' && /^\d{8}$/.test(id);
}

/**
 * Shape estático del doc de una compra activa. Los timestamps (serverTimestamp)
 * los añade el servicio; aquí solo va lo determinista para poder testearlo.
 * @param {{name?: string, createdBy?: string|null}} [param0]
 * @returns {Object}
 */
export function buildActiveShoppingDoc({ name, createdBy } = {}) {
  return {
    name: name || 'Compra',
    status: 'active',
    createdBy: createdBy || null,
    archivedAt: null,
    archivedBy: null
  };
}

/**
 * Devuelve la compra activa (status === 'active') de una lista de compras, o null.
 * @param {Array} shoppings
 * @returns {Object|null}
 */
export function pickActiveShopping(shoppings) {
  const list = Array.isArray(shoppings) ? shoppings : [];
  return list.find((s) => s && s.status === 'active') || null;
}

/**
 * Separa la compra activa del histórico. El histórico son todas las demás
 * (archivadas y legacy sin status), preservando el orden de entrada (el servicio
 * ya las devuelve ordenadas por createdAt desc).
 * @param {Array} shoppings
 * @returns {{active: Object|null, history: Array}}
 */
export function partitionShoppings(shoppings) {
  const list = Array.isArray(shoppings) ? shoppings : [];
  const active = pickActiveShopping(list);
  const history = list.filter((s) => s && s.id !== active?.id);
  return { active, history };
}

/**
 * Normaliza la edición de cantidad/unidad de un item de la compra.
 * Cantidad debe ser > 0 (permite decimales para peso/volumen); por defecto 1.
 * Unidad vacía → 'unidad'.
 * @param {{quantity?: number|string, unit?: string}} [param0]
 * @returns {{quantity: number, unit: string}}
 */
export function normalizeShoppingItemEdit({ quantity, unit } = {}) {
  const q = Number(quantity);
  return {
    quantity: Number.isFinite(q) && q > 0 ? q : 1,
    unit: (typeof unit === 'string' && unit.trim()) ? unit.trim() : 'unidad'
  };
}

/**
 * Cuenta los items de una compra por estado.
 * @param {Array} items
 * @returns {{total: number, bought: number, notFound: number, pending: number}}
 */
export function computeShoppingCounts(items) {
  const list = Array.isArray(items) ? items : [];
  let bought = 0;
  let notFound = 0;
  let pending = 0;
  for (const it of list) {
    if (it?.status === 'bought') bought += 1;
    else if (it?.status === 'not_found') notFound += 1;
    else pending += 1;
  }
  return { total: list.length, bought, notFound, pending };
}

/**
 * Nombre por defecto de una compra nueva: "<lista> · yyyy-mm-dd" con la fecha dada.
 * @param {string} masterName
 * @param {Date} [now]
 * @returns {string}
 */
export function defaultShoppingName(masterName, now = new Date()) {
  return getShoppingName(masterName, getTodayShoppingId(now));
}
