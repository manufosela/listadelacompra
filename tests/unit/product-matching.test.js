import { describe, it, expect } from 'vitest';
import {
  normalizeProductName,
  calculateSimilarity,
} from '../../public/js/product-matching.js';

describe('normalizeProductName', () => {
  it('pasa a minúsculas y recorta espacios', () => {
    expect(normalizeProductName('  Leche Entera  ')).toBe('leche entera');
  });

  it('quita acentos y diacríticos', () => {
    expect(normalizeProductName('Plátano')).toBe('platano');
    expect(normalizeProductName('Jamón Serrano')).toBe('jamon serrano');
    expect(normalizeProductName('Açúcar')).toBe('acucar');
  });

  it('colapsa espacios múltiples', () => {
    expect(normalizeProductName('agua   con    gas')).toBe('agua con gas');
  });

  it('devuelve cadena vacía para valores nulos', () => {
    expect(normalizeProductName('')).toBe('');
    expect(normalizeProductName(null)).toBe('');
    expect(normalizeProductName(undefined)).toBe('');
  });
});

describe('calculateSimilarity', () => {
  it('es 1 para nombres idénticos tras normalizar', () => {
    expect(calculateSimilarity('Leche', 'leche')).toBe(1);
    expect(calculateSimilarity('Plátano', 'platano')).toBe(1);
  });

  it('es 0 si alguno es vacío', () => {
    expect(calculateSimilarity('', 'leche')).toBe(0);
    expect(calculateSimilarity('leche', '')).toBe(0);
  });

  it('da 0.9 cuando uno es prefijo del otro', () => {
    expect(calculateSimilarity('leche', 'leche entera')).toBe(0.9);
  });

  it('da 0.8 cuando todas las palabras del query están en el producto', () => {
    // "entera leche" no es prefijo de "leche entera desnatada", pero todas
    // sus palabras aparecen → 0.8
    expect(calculateSimilarity('entera leche', 'leche entera desnatada')).toBe(0.8);
  });

  it('da 0.8 cuando el término buscado es una palabra del producto', () => {
    // La palabra del query aparece en el producto → coincidencia de palabras (0.8),
    // que tiene prioridad sobre la regla de "contiene" (0.7).
    expect(calculateSimilarity('gas', 'agua con gas')).toBe(0.8);
  });

  it('da similitud parcial proporcional a las palabras que coinciden', () => {
    // 1 de 2 palabras coincide → 0.5 * (1/2) = 0.25
    expect(calculateSimilarity('tomate frito', 'tomate crudo')).toBeCloseTo(0.25);
  });

  it('es 0 cuando no hay ninguna coincidencia', () => {
    expect(calculateSimilarity('leche', 'xyz')).toBe(0);
  });

  it('ignora acentos al comparar', () => {
    expect(calculateSimilarity('melón', 'melon')).toBe(1);
  });
});
