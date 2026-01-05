/**
 * Firestore Utilities
 * Utilidades para operaciones Firestore con manejo de timeout y errores
 */

/**
 * Envuelve una promesa con timeout
 * @param {Promise} promise - Promesa a envolver
 * @param {number} ms - Tiempo máximo en ms
 * @param {string} operation - Nombre de la operación para el mensaje de error
 * @returns {Promise} Promesa con timeout
 */
export function withTimeout(promise, ms, operation = 'Operación') {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timeout: no se recibió respuesta en ${ms / 1000}s`));
    }, ms);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Ejecuta getDocs con timeout
 * @param {Query} queryRef - Query de Firestore
 * @param {number} timeout - Tiempo máximo en ms (default 10s)
 * @returns {Promise<QuerySnapshot>}
 */
export async function getDocsWithTimeout(queryRef, timeout = 10000) {
  const { getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
  return withTimeout(getDocs(queryRef), timeout, 'Consulta Firestore');
}

/**
 * Ejecuta getDoc con timeout
 * @param {DocumentReference} docRef - Referencia del documento
 * @param {number} timeout - Tiempo máximo en ms (default 10s)
 * @returns {Promise<DocumentSnapshot>}
 */
export async function getDocWithTimeout(docRef, timeout = 10000) {
  const { getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
  return withTimeout(getDoc(docRef), timeout, 'Obtener documento');
}

/**
 * Crea un onSnapshot con detección de timeout inicial
 * Si no recibe datos en el tiempo especificado, llama al errorCallback
 * @param {DocumentReference|Query} ref - Referencia o query
 * @param {Function} successCallback - Callback cuando llegan datos
 * @param {Function} errorCallback - Callback en caso de error o timeout
 * @param {number} initialTimeout - Timeout para la primera respuesta (default 15s)
 * @returns {Function} Función para cancelar la suscripción
 */
export function onSnapshotWithTimeout(ref, successCallback, errorCallback, initialTimeout = 15000) {
  let hasReceivedData = false;
  let unsubscribe = null;

  // Timeout para la primera respuesta
  const timeoutId = setTimeout(() => {
    if (!hasReceivedData) {
      const error = new Error('Firestore timeout: no se recibieron datos iniciales');
      errorCallback(error);
      // Cancelar suscripción si existe
      if (unsubscribe) {
        unsubscribe();
      }
    }
  }, initialTimeout);

  // Importar dinámicamente y crear suscripción
  import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js')
    .then(({ onSnapshot }) => {
      unsubscribe = onSnapshot(
        ref,
        (snapshot) => {
          if (!hasReceivedData) {
            hasReceivedData = true;
            clearTimeout(timeoutId);
          }
          successCallback(snapshot);
        },
        (error) => {
          clearTimeout(timeoutId);
          errorCallback(error);
        }
      );
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      errorCallback(error);
    });

  // Retornar función de limpieza
  return () => {
    clearTimeout(timeoutId);
    if (unsubscribe) {
      unsubscribe();
    }
  };
}
