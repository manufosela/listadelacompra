/**
 * OpenAI Service
 * Procesa tickets de compra usando Firebase Functions con OpenAI GPT-4 Vision
 */

import { functions } from './firebase-config.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';
import { getCurrentGroupId } from './group.js';

const processTicketFn = httpsCallable(functions, 'processTicket');
const savePurchaseFn = httpsCallable(functions, 'savePurchase');

/**
 * Procesa una imagen de ticket via Firebase Function
 * @param {string} imageBase64 - Imagen en base64
 * @returns {Promise<Object>} Datos extraídos del ticket
 */
export async function processTicketImage(imageBase64) {
  const groupId = getCurrentGroupId();
  if (!groupId) {
    throw new Error('No group selected');
  }

  const result = await processTicketFn({
    imageBase64,
    groupId
  });

  return result.data;
}

/**
 * Guarda una compra procesada en Firestore
 * @param {Object} ticketData - Datos del ticket procesado
 * @param {string} ticketImageUrl - URL de la imagen del ticket (opcional)
 * @returns {Promise<Object>} Resultado con purchaseId
 */
export async function savePurchase(ticketData, ticketImageUrl = null) {
  const groupId = getCurrentGroupId();
  if (!groupId) {
    throw new Error('No group selected');
  }

  const result = await savePurchaseFn({
    groupId,
    ticketData,
    ticketImageUrl
  });

  return result.data;
}

/**
 * Convierte File a base64
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>} Base64 string (sin prefijo data:)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime una imagen antes de enviar
 * @param {File} file - Archivo de imagen original
 * @param {number} maxWidth - Ancho máximo
 * @param {number} quality - Calidad de compresión (0-1)
 * @returns {Promise<string>} Base64 comprimido
 */
export function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const base64 = canvas.toDataURL('image/jpeg', quality);
      resolve(base64.split(',')[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
