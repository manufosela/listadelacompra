import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../public/js/escape-html.js';

describe('escapeHtml', () => {
  it('escapa los caracteres peligrosos de HTML', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('neutraliza un payload de atributo con comillas', () => {
    expect(escapeHtml('" onerror="alert(1)')).toBe(
      '&quot; onerror=&quot;alert(1)'
    );
  });

  it('escapa el ampersand primero para no romper otras entidades', () => {
    expect(escapeHtml('Tom & Jerry <3')).toBe('Tom &amp; Jerry &lt;3');
  });

  it('escapa comillas simples', () => {
    expect(escapeHtml("d'Arc")).toBe('d&#39;Arc');
  });

  it('deja intacto el texto sin caracteres especiales', () => {
    expect(escapeHtml('Compra semanal')).toBe('Compra semanal');
  });

  it('convierte valores no-string a string', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(undefined)).toBe('undefined');
  });
});
