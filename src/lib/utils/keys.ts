/**
 * Utilidades para manejar keys únicas en componentes React
 * Evita problemas de duplicación de keys cuando los IDs no son válidos
 */

import { getLogger } from "@/lib/logger";

const log = getLogger("KeyUtils");

/**
 * Genera una key única y segura para componentes React
 * @param item El elemento que necesita una key
 * @param index El índice del elemento en la lista (fallback)
 * @param prefix Prefijo para identificar el tipo de elemento
 * @returns Una key única y segura
 */
export function generateUniqueKey(
  item: any, 
  index: number, 
  prefix: string = 'item'
): string {
  // Si el item tiene un ID válido, usarlo
  if (item?.id && typeof item.id === 'string' && item.id.trim() !== '') {
    return item.id;
  }
  
  // Si el item tiene un firestore_id válido, usarlo
  if (item?.firestore_id && typeof item.firestore_id === 'string' && item.firestore_id.trim() !== '') {
    return item.firestore_id;
  }
  
  // Generar una key alternativa usando información disponible
  let alternativeKey = prefix;
  
  // Agregar nombre si está disponible
  if (item?.name && typeof item.name === 'string' && item.name.trim() !== '') {
    alternativeKey += `-${item.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}`;
  }
  
  // Agregar SKU si está disponible
  if (item?.sku && typeof item.sku === 'string' && item.sku.trim() !== '') {
    alternativeKey += `-${item.sku.replace(/[^a-zA-Z0-9]/g, '')}`;
  }
  
  // Agregar creditorName si está disponible (para deudas)
  if (item?.creditorName && typeof item.creditorName === 'string' && item.creditorName.trim() !== '') {
    alternativeKey += `-${item.creditorName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}`;
  }
  
  // Siempre agregar el índice como último recurso
  alternativeKey += `-${index}`;
  
  // Agregar timestamp para garantizar unicidad
  alternativeKey += `-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  // Log para debugging
  log.debug("Generated alternative key", {
    originalId: item?.id,
    alternativeKey,
    itemInfo: {
      name: item?.name,
      sku: item?.sku,
      creditorName: item?.creditorName
    },
    index
  });
  
  return alternativeKey;
}

/**
 * Función wrapper para .map() que genera keys seguras
 * @param items Array de elementos a mapear
 * @param renderFn Función de renderizado
 * @param prefix Prefijo para las keys
 * @returns Array de elementos con keys seguras
 */
export function safeMap<T, R>(
  items: T[], 
  renderFn: (item: T, index: number) => R, 
  prefix: string = 'item'
): R[] {
  return items.map((item, index) => {
    const element = renderFn(item, index);
    
    // Si el elemento es un React element, agregar key segura
    if (element && typeof element === 'object' && 'key' in element) {
      const safeKey = generateUniqueKey(item, index, prefix);
      (element as any).key = safeKey;
    }
    
    return element;
  });
}

/**
 * Verifica si una key es válida y única
 * @param key La key a verificar
 * @param existingKeys Conjunto de keys existentes
 * @returns True si la key es válida y única
 */
export function isValidKey(key: string, existingKeys: Set<string> = new Set()): boolean {
  return Boolean(key && key.trim() !== '' && !existingKeys.has(key));
}

/**
 * Genera un mapa de keys únicas para un array de elementos
 * @param items Array de elementos
 * @param prefix Prefijo para las keys
 * @returns Mapa de elemento a key única
 */
export function generateKeyMap<T>(
  items: T[], 
  prefix: string = 'item'
): Map<T, string> {
  const keyMap = new Map<T, string>();
  const usedKeys = new Set<string>();
  
  items.forEach((item, index) => {
    let key = generateUniqueKey(item, index, prefix);
    
    // Asegurar que la key sea única
    let originalKey = key;
    let counter = 1;
    while (usedKeys.has(key)) {
      key = `${originalKey}-${counter}`;
      counter++;
    }
    
    usedKeys.add(key);
    keyMap.set(item, key);
  });
  
  return keyMap;
}

/**
 * Función para detectar y reportar elementos sin ID válido
 * @param items Array de elementos a verificar
 * @param itemType Tipo de elemento para el reporte
 */
export function reportInvalidIds<T>(items: T[], itemType: string = 'item'): void {
  const invalidItems = items.filter(item => {
    const itemAsAny = item as any;
    return !itemAsAny?.id ||
      (typeof itemAsAny.id === 'string' && itemAsAny.id.trim() === '') ||
      (typeof itemAsAny.id === 'object' && itemAsAny.id === null);
  });
  
  if (invalidItems.length > 0) {
    log.warn(`Found ${invalidItems.length} ${itemType}(s) with invalid IDs`, {
      itemType,
      count: invalidItems.length,
      invalidItems: invalidItems.slice(0, 3).map(item => {
        const itemAsAny = item as any;
        return {
          id: itemAsAny?.id,
          name: itemAsAny?.name || itemAsAny?.creditorName || 'Unknown',
          sku: itemAsAny?.sku
        };
      })
    });
  }
}