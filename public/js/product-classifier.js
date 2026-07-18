/**
 * Cliente de la Cloud Function classifyProduct.
 * Clasifica un producto en una de las categorías del grupo (reusando el catálogo
 * o pidiéndoselo a la IA). Pensado para llamarse en segundo plano al añadir un
 * producto nuevo, sin bloquear la interfaz.
 */
import { functions } from '/js/firebase-config.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';

/**
 * @param {string} groupId
 * @param {string} productName
 * @param {Array<{id: string, name: string}>} categories - categorías del grupo
 * @returns {Promise<{category: string, source: string}>}
 */
export async function classifyProduct(groupId, productName, categories) {
  const fn = httpsCallable(functions, 'classifyProduct');
  const result = await fn({ groupId, productName, categories });
  return result.data;
}
