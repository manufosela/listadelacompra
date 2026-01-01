/**
 * Ticket Processing Service
 * Gestiona el escaneo y procesamiento de tickets de compra
 */

import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { db } from './firebase-config.js';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const functions = getFunctions(undefined, 'europe-west1');
const storage = getStorage();

/**
 * Convierte un archivo de imagen a base64
 */
export async function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime una imagen antes de enviarla
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Procesa un ticket con la Cloud Function
 * @param {Object} params
 * @param {File|Blob} params.imageFile - Archivo de imagen
 * @param {string} params.groupId - ID del grupo
 * @param {string} params.listId - ID de la lista (opcional)
 * @param {string} params.userId - ID del usuario propietario de la lista
 * @returns {Promise<Object>} Datos del ticket procesado
 */
export async function processTicket({ imageFile, groupId, listId, userId }) {
  // Comprimir imagen
  const compressed = await compressImage(imageFile);
  const base64 = await imageToBase64(compressed);

  // Llamar a Cloud Function
  const processTicketFn = httpsCallable(functions, 'processTicket');
  const result = await processTicketFn({
    imageBase64: base64,
    groupId,
    listId,
    userId
  });

  return result.data;
}

/**
 * Aplica los datos del ticket a una lista
 * @param {Object} params
 * @param {string} params.userId - ID del propietario de la lista
 * @param {string} params.listId - ID de la lista
 * @param {Array} params.ticketItems - Items del ticket procesados
 * @param {Array} params.listItems - Items actuales de la lista
 * @param {Object} params.ticketMeta - Metadata del ticket (store, date, total)
 */
export async function applyTicketToList({ userId, listId, ticketItems, listItems, ticketMeta }) {
  const itemsRef = collection(db, 'users', userId, 'lists', listId, 'items');
  const listRef = doc(db, 'users', userId, 'lists', listId);

  const results = {
    updated: 0,
    created: 0,
    ignored: 0
  };

  for (const ticketItem of ticketItems) {
    if (ticketItem.status === 'ignored') {
      results.ignored++;
      continue;
    }

    if (ticketItem.status === 'matched' && ticketItem.matchedListItemId) {
      // Actualizar item existente
      const itemRef = doc(db, 'users', userId, 'lists', listId, 'items', ticketItem.matchedListItemId);
      await updateDoc(itemRef, {
        checked: true,
        price: ticketItem.totalPrice || ticketItem.unitPrice,
        unitPrice: ticketItem.unitPrice,
        checkedAt: serverTimestamp(),
        ticketStore: ticketMeta?.store || null,
        ticketDate: ticketMeta?.date || null
      });
      results.updated++;
    } else if (ticketItem.status === 'new' || ticketItem.status === 'unmatched') {
      // Crear nuevo item
      await addDoc(itemsRef, {
        name: ticketItem.name,
        quantity: ticketItem.quantity || 1,
        unit: ticketItem.unit || 'unidad',
        category: ticketItem.category || 'otros',
        checked: true,
        price: ticketItem.totalPrice || ticketItem.unitPrice,
        unitPrice: ticketItem.unitPrice,
        checkedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        ticketStore: ticketMeta?.store || null,
        ticketDate: ticketMeta?.date || null
      });
      results.created++;
    }
  }

  // Actualizar timestamp de la lista
  await updateDoc(listRef, {
    updatedAt: serverTimestamp(),
    lastTicketProcessed: serverTimestamp()
  });

  return results;
}

/**
 * Guarda el ticket en el historial
 */
export async function saveTicketToHistory({ userId, listId, groupId, ticketData, imageUrl }) {
  const ticketsRef = collection(db, 'users', userId, 'lists', listId, 'tickets');

  const ticketDoc = await addDoc(ticketsRef, {
    store: ticketData.store,
    date: ticketData.date,
    total: ticketData.total,
    subtotal: ticketData.subtotal,
    taxes: ticketData.taxes,
    itemCount: ticketData.items?.length || 0,
    imageUrl: imageUrl || null,
    groupId,
    processedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });

  return ticketDoc.id;
}
