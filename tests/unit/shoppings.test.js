import { describe, it, expect } from 'vitest';
import { getTodayShoppingId, getShoppingName, selectItemsToMigrate } from '../../public/js/shoppings-utils.js';

describe('getTodayShoppingId', () => {
  it('formatea la fecha como yyyymmdd con ceros a la izquierda', () => {
    expect(getTodayShoppingId(new Date(2026, 0, 5))).toBe('20260105'); // 5 enero
    expect(getTodayShoppingId(new Date(2026, 11, 31))).toBe('20261231'); // 31 diciembre
    expect(getTodayShoppingId(new Date(2026, 6, 18))).toBe('20260718');
  });
});

describe('getShoppingName', () => {
  it('compone "<lista> · yyyy-mm-dd"', () => {
    expect(getShoppingName('Compra semanal', '20260718')).toBe('Compra semanal · 2026-07-18');
  });

  it('usa "Compra" si no hay nombre de lista', () => {
    expect(getShoppingName('', '20260718')).toBe('Compra · 2026-07-18');
    expect(getShoppingName(undefined, '20260101')).toBe('Compra · 2026-01-01');
  });
});

describe('selectItemsToMigrate', () => {
  it('selecciona solo los productos sin marcar (checked !== true)', () => {
    const items = [
      { id: 'a', name: 'Leche', checked: false },
      { id: 'b', name: 'Pan', checked: true },
      { id: 'c', name: 'Huevos' } // sin checked = sin marcar
    ];
    expect(selectItemsToMigrate(items).map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('excluye las sublistas/checklists', () => {
    const items = [
      { id: 'a', name: 'Fruta', checked: false, isChecklist: true },
      { id: 'b', name: 'Agua', checked: false }
    ];
    expect(selectItemsToMigrate(items).map((i) => i.id)).toEqual(['b']);
  });

  it('devuelve [] para entradas no válidas', () => {
    expect(selectItemsToMigrate(null)).toEqual([]);
    expect(selectItemsToMigrate(undefined)).toEqual([]);
  });
});
