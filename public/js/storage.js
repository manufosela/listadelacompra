/**
 * Servicio de Storage para subir archivos a Firebase Storage
 */

import { storage } from './firebase-config.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';

/**
 * Sube una imagen como icono de lista
 * @param {File} file - Archivo de imagen
 * @param {string} listId - ID de la lista
 * @returns {Promise<string>} URL de descarga de la imagen
 */
export async function uploadListIcon(file, listId) {
  if (!file) throw new Error('No se proporcionó archivo');

  // Validar tipo de archivo
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Tipo de archivo no válido. Usa JPG, PNG, GIF o WebP.');
  }

  // Validar tamaño (máximo 2MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('La imagen es demasiado grande. Máximo 2MB.');
  }

  // Generar nombre único basado en listId
  const extension = file.name.split('.').pop();
  const fileName = `list-icons/${listId}.${extension}`;

  const storageRef = ref(storage, fileName);

  // Subir archivo
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type
  });

  // Obtener URL de descarga
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}

/**
 * Redimensiona una imagen antes de subirla
 * @param {File} file - Archivo de imagen
 * @param {number} maxWidth - Ancho máximo
 * @param {number} maxHeight - Alto máximo
 * @returns {Promise<Blob>} Imagen redimensionada
 */
export async function resizeImage(file, maxWidth = 200, maxHeight = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Calcular nuevas dimensiones manteniendo proporción
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => resolve(blob),
        'image/webp',
        0.85
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Recorta y redimensiona una imagen a un cuadrado centrado (ideal para iconos)
 * @param {File} file - Archivo de imagen
 * @param {number} size - Tamaño del cuadrado resultante
 * @returns {Promise<Blob>} Imagen recortada y redimensionada
 */
export async function cropSquareImage(file, size = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      const { width, height } = img;

      // Calcular el recorte cuadrado centrado
      const minDimension = Math.min(width, height);
      const cropX = (width - minDimension) / 2;
      const cropY = (height - minDimension) / 2;

      // Configurar canvas al tamaño final
      canvas.width = size;
      canvas.height = size;

      // Dibujar la imagen recortada y redimensionada
      ctx.drawImage(
        img,
        cropX, cropY,           // Origen del recorte
        minDimension, minDimension, // Tamaño del recorte
        0, 0,                   // Destino en canvas
        size, size              // Tamaño final
      );

      canvas.toBlob(
        blob => resolve(blob),
        'image/webp',
        0.85
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Sube una imagen como icono de grupo
 * @param {File} file - Archivo de imagen
 * @param {string} groupId - ID del grupo
 * @returns {Promise<string>} URL de descarga de la imagen
 */
export async function uploadGroupIcon(file, groupId) {
  if (!file) throw new Error('No se proporcionó archivo');

  // Validar tipo de archivo
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Tipo de archivo no válido. Usa JPG, PNG, GIF o WebP.');
  }

  // Validar tamaño (máximo 2MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('La imagen es demasiado grande. Máximo 2MB.');
  }

  // Generar nombre único basado en groupId
  const extension = file.name.split('.').pop();
  const fileName = `group-icons/${groupId}.${extension}`;

  const storageRef = ref(storage, fileName);

  // Subir archivo
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type
  });

  // Obtener URL de descarga
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}

/**
 * Elimina el icono de una lista
 * @param {string} listId - ID de la lista
 * @returns {Promise<void>}
 */
export async function deleteListIcon(listId) {
  if (!listId) throw new Error('No se proporcionó ID de lista');

  // Intentar eliminar con diferentes extensiones
  const extensions = ['webp', 'png', 'jpg', 'jpeg', 'gif'];

  for (const ext of extensions) {
    try {
      const fileName = `list-icons/${listId}.${ext}`;
      const storageRef = ref(storage, fileName);
      await deleteObject(storageRef);
      return; // Éxito, salir
    } catch (error) {
      // Continuar con la siguiente extensión si no existe
      if (error.code !== 'storage/object-not-found') {
        throw error;
      }
    }
  }
}
