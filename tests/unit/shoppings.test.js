import { describe, it, expect } from 'vitest';
import {
  getTodayShoppingId,
  getShoppingName,
  selectItemsToMigrate,
  isLegacyShoppingId,
  buildActiveShoppingDoc,
  pickActiveShopping,
  partitionShoppings,
  normalizeShoppingItemEdit,
  computeShoppingCounts,
  defaultShoppingName
} from '../../public/js/shoppings-utils.js';

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

describe('isLegacyShoppingId', () => {
  it('reconoce solo ids yyyymmdd (8 dígitos)', () => {
    expect(isLegacyShoppingId('20260718')).toBe(true);
    expect(isLegacyShoppingId('20261231')).toBe(true);
  });

  it('rechaza ids autogenerados y valores no válidos', () => {
    expect(isLegacyShoppingId('aB3xY9kLmN0pQ2')).toBe(false);
    expect(isLegacyShoppingId('2026071')).toBe(false); // 7 dígitos
    expect(isLegacyShoppingId('202607180')).toBe(false); // 9 dígitos
    expect(isLegacyShoppingId(null)).toBe(false);
    expect(isLegacyShoppingId(20260718)).toBe(false); // no es string
  });
});

describe('buildActiveShoppingDoc', () => {
  it('genera el shape de compra activa sin timestamps', () => {
    expect(buildActiveShoppingDoc({ name: 'Compra semanal · 2026-07-19', createdBy: 'uid1' })).toEqual({
      name: 'Compra semanal · 2026-07-19',
      status: 'active',
      createdBy: 'uid1',
      archivedAt: null,
      archivedBy: null
    });
  });

  it('aplica valores por defecto', () => {
    expect(buildActiveShoppingDoc()).toEqual({
      name: 'Compra',
      status: 'active',
      createdBy: null,
      archivedAt: null,
      archivedBy: null
    });
  });
});

describe('pickActiveShopping', () => {
  it('devuelve la compra con status active', () => {
    const list = [
      { id: 'a', status: 'archived' },
      { id: 'b', status: 'active' },
      { id: '20260101' } // legacy sin status
    ];
    expect(pickActiveShopping(list)?.id).toBe('b');
  });

  it('devuelve null si no hay activa', () => {
    expect(pickActiveShopping([{ id: 'a', status: 'archived' }])).toBeNull();
    expect(pickActiveShopping(null)).toBeNull();
  });
});

describe('partitionShoppings', () => {
  it('separa la activa del histórico preservando el orden', () => {
    const list = [
      { id: 'b', status: 'active' },
      { id: 'a', status: 'archived' },
      { id: '20260101' } // legacy → histórico
    ];
    const { active, history } = partitionShoppings(list);
    expect(active?.id).toBe('b');
    expect(history.map((s) => s.id)).toEqual(['a', '20260101']);
  });

  it('sin activa, todo va al histórico', () => {
    const list = [{ id: '20260101' }, { id: '20260102' }];
    const { active, history } = partitionShoppings(list);
    expect(active).toBeNull();
    expect(history.map((s) => s.id)).toEqual(['20260101', '20260102']);
  });
});

describe('normalizeShoppingItemEdit', () => {
  it('normaliza cantidad no válida a 1 y unidad vacía a "unidad"', () => {
    expect(normalizeShoppingItemEdit({ quantity: 0, unit: '' })).toEqual({ quantity: 1, unit: 'unidad' });
    expect(normalizeShoppingItemEdit({ quantity: -3, unit: '  ' })).toEqual({ quantity: 1, unit: 'unidad' });
    expect(normalizeShoppingItemEdit({ quantity: 'x' })).toEqual({ quantity: 1, unit: 'unidad' });
    expect(normalizeShoppingItemEdit()).toEqual({ quantity: 1, unit: 'unidad' });
  });

  it('conserva cantidades válidas (incluidos decimales) y recorta la unidad', () => {
    expect(normalizeShoppingItemEdit({ quantity: 3, unit: 'litros' })).toEqual({ quantity: 3, unit: 'litros' });
    expect(normalizeShoppingItemEdit({ quantity: '0.5', unit: '  kg  ' })).toEqual({ quantity: 0.5, unit: 'kg' });
  });
});

describe('computeShoppingCounts', () => {
  it('cuenta por estado', () => {
    const items = [
      { status: 'bought' },
      { status: 'bought' },
      { status: 'not_found' },
      { status: 'pending' },
      {} // sin status → pending
    ];
    expect(computeShoppingCounts(items)).toEqual({ total: 5, bought: 2, notFound: 1, pending: 2 });
  });

  it('lista vacía o no válida → todo a 0', () => {
    expect(computeShoppingCounts([])).toEqual({ total: 0, bought: 0, notFound: 0, pending: 0 });
    expect(computeShoppingCounts(null)).toEqual({ total: 0, bought: 0, notFound: 0, pending: 0 });
  });
});

describe('defaultShoppingName', () => {
  it('compone "<lista> · yyyy-mm-dd" con la fecha dada', () => {
    expect(defaultShoppingName('Compra semanal', new Date(2026, 6, 19))).toBe('Compra semanal · 2026-07-19');
  });

  it('usa "Compra" si no hay nombre de lista', () => {
    expect(defaultShoppingName('', new Date(2026, 0, 5))).toBe('Compra · 2026-01-05');
  });
});
