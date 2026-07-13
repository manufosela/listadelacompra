import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '../../public/js/event-bus.js';

describe('eventBus', () => {
  beforeEach(() => {
    eventBus.reset();
  });

  it('entrega el payload a los listeners suscritos', () => {
    const received = [];
    eventBus.on('test:event', (p) => received.push(p));
    eventBus.emit('test:event', { value: 42 });
    expect(received).toEqual([{ value: 42 }]);
  });

  it('deja de entregar tras off()', () => {
    const fn = vi.fn();
    eventBus.on('test:event', fn);
    eventBus.off('test:event', fn);
    eventBus.emit('test:event', {});
    expect(fn).not.toHaveBeenCalled();
  });

  it('un listener que lanza no impide que los demás reciban el evento', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const good1 = vi.fn();
    const good2 = vi.fn();
    eventBus.on('test:event', good1);
    eventBus.on('test:event', () => {
      throw new Error('listener roto');
    });
    eventBus.on('test:event', good2);

    expect(() => eventBus.emit('test:event', { ok: true })).not.toThrow();
    expect(good1).toHaveBeenCalledWith({ ok: true });
    expect(good2).toHaveBeenCalledWith({ ok: true });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('emitir un evento sin listeners no falla', () => {
    expect(() => eventBus.emit('sin:listeners', {})).not.toThrow();
  });
});
