/**
 * Cache Service
 * Sistema de cache inteligente para reducir llamadas a Firebase.
 *
 * Estrategias:
 * - memory: Solo en memoria (se pierde al recargar)
 * - session: sessionStorage + memoria (persiste en navegación SPA)
 * - persistent: localStorage + memoria (persiste entre sesiones)
 */

// Cache en memoria
const memoryCache = new Map();

// TTL por defecto en milisegundos
const DEFAULT_TTL = {
  user: 0,           // No expira durante la sesión
  groups: 5 * 60 * 1000,    // 5 minutos
  members: 5 * 60 * 1000,   // 5 minutos
  lists: 2 * 60 * 1000,     // 2 minutos
  products: 60 * 60 * 1000, // 1 hora
  default: 60 * 1000        // 1 minuto
};

/**
 * Genera una clave única para el cache
 */
function getCacheKey(namespace, id = '') {
  return `hc_cache_${namespace}${id ? '_' + id : ''}`;
}

/**
 * Obtiene un valor del cache
 * @param {string} namespace - Tipo de dato (user, groups, lists, etc.)
 * @param {string} id - ID opcional para datos específicos
 * @param {Object} options - Opciones
 * @returns {any} Valor cacheado o null si no existe/expiró
 */
export function getFromCache(namespace, id = '', options = {}) {
  const key = getCacheKey(namespace, id);
  const strategy = options.strategy || 'session';

  // Primero buscar en memoria (más rápido)
  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    if (!isExpired(cached)) {
      return cached.data;
    }
    memoryCache.delete(key);
  }

  // Si no está en memoria, buscar en storage
  if (strategy === 'session' || strategy === 'persistent') {
    const storage = strategy === 'persistent' ? localStorage : sessionStorage;
    try {
      const stored = storage.getItem(key);
      if (stored) {
        const cached = JSON.parse(stored);
        if (!isExpired(cached)) {
          // Restaurar a memoria para acceso rápido
          memoryCache.set(key, cached);
          return cached.data;
        }
        storage.removeItem(key);
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
  }

  return null;
}

/**
 * Guarda un valor en el cache
 * @param {string} namespace - Tipo de dato
 * @param {any} data - Datos a cachear
 * @param {string} id - ID opcional
 * @param {Object} options - Opciones (ttl, strategy)
 */
export function setInCache(namespace, data, id = '', options = {}) {
  const key = getCacheKey(namespace, id);
  const ttl = options.ttl ?? DEFAULT_TTL[namespace] ?? DEFAULT_TTL.default;
  const strategy = options.strategy || 'session';

  const cached = {
    data,
    timestamp: Date.now(),
    ttl
  };

  // Siempre guardar en memoria
  memoryCache.set(key, cached);

  // Guardar en storage si corresponde
  if (strategy === 'session' || strategy === 'persistent') {
    const storage = strategy === 'persistent' ? localStorage : sessionStorage;
    try {
      storage.setItem(key, JSON.stringify(cached));
    } catch (e) {
      console.warn('Cache write error:', e);
    }
  }
}

/**
 * Invalida (elimina) un valor del cache
 */
export function invalidateCache(namespace, id = '') {
  const key = getCacheKey(namespace, id);
  memoryCache.delete(key);

  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch (e) {
    // Ignorar errores de storage
  }
}

/**
 * Invalida todo el cache de un namespace
 */
export function invalidateNamespace(namespace) {
  const prefix = getCacheKey(namespace);

  // Limpiar memoria
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  // Limpiar storage
  [sessionStorage, localStorage].forEach(storage => {
    try {
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (key?.startsWith(prefix)) {
          storage.removeItem(key);
        }
      }
    } catch (e) {
      // Ignorar
    }
  });
}

/**
 * Limpia todo el cache
 */
export function clearAllCache() {
  memoryCache.clear();

  [sessionStorage, localStorage].forEach(storage => {
    try {
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (key?.startsWith('hc_cache_')) {
          storage.removeItem(key);
        }
      }
    } catch (e) {
      // Ignorar
    }
  });
}

/**
 * Verifica si un valor ha expirado
 */
function isExpired(cached) {
  if (!cached.ttl || cached.ttl === 0) return false;
  return Date.now() - cached.timestamp > cached.ttl;
}

/**
 * Helper: obtiene datos con cache-first strategy
 * Si está en cache y no expiró, retorna del cache.
 * Si no, ejecuta fetchFn, cachea y retorna.
 *
 * @param {string} namespace
 * @param {string} id
 * @param {Function} fetchFn - Función async que obtiene los datos
 * @param {Object} options
 * @returns {Promise<any>}
 */
export async function getCachedOrFetch(namespace, id, fetchFn, options = {}) {
  // Intentar obtener del cache
  const cached = getFromCache(namespace, id, options);
  if (cached !== null) {
    return cached;
  }

  // Si no está en cache, obtener datos frescos
  const freshData = await fetchFn();

  // Guardar en cache
  if (freshData !== null && freshData !== undefined) {
    setInCache(namespace, freshData, id, options);
  }

  return freshData;
}

/**
 * Obtiene datos del cache y refresca en background
 * Retorna inmediatamente del cache si existe, pero actualiza en segundo plano.
 * Útil para datos que cambian poco pero queremos mantener frescos.
 *
 * @param {string} namespace
 * @param {string} id
 * @param {Function} fetchFn
 * @param {Function} onUpdate - Callback cuando se actualizan los datos
 * @param {Object} options
 */
export async function getStaleWhileRevalidate(namespace, id, fetchFn, onUpdate, options = {}) {
  const cached = getFromCache(namespace, id, options);

  // Refrescar en background
  fetchFn().then(freshData => {
    if (freshData !== null && freshData !== undefined) {
      setInCache(namespace, freshData, id, options);
      // Si los datos cambiaron, notificar
      if (JSON.stringify(freshData) !== JSON.stringify(cached)) {
        onUpdate?.(freshData);
      }
    }
  }).catch(err => {
    console.warn('Background refresh failed:', err);
  });

  // Retornar datos cacheados inmediatamente (pueden ser null)
  return cached;
}
