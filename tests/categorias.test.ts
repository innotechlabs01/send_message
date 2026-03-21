import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Categoria } from '@/types';

function categoriaValida(overrides: Partial<Categoria> = {}): Categoria {
  return {
    id: crypto.randomUUID(),
    nombre: 'Cumpleaños',
    icono: '🎂',
    activa: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Lógica de categorías', () => {
  it('solo muestra categorías activas', () => {
    const todas: Categoria[] = [
      categoriaValida({ activa: true }),
      categoriaValida({ activa: false }),
      categoriaValida({ activa: true }),
    ];
    const activas = todas.filter((c) => c.activa);
    expect(activas).toHaveLength(2);
    expect(activas.every((c) => c.activa)).toBe(true);
  });

  it('propiedad: filtrar activas nunca incluye inactivas', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ activa: fc.boolean() }), { minLength: 0, maxLength: 20 }),
        (items) => {
          const activas = items.filter((c) => c.activa);
          return activas.every((c) => c.activa === true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('propiedad: el conteo de activas es <= total', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ activa: fc.boolean() }), { minLength: 0, maxLength: 50 }),
        (items) => items.filter((c) => c.activa).length <= items.length
      ),
      { numRuns: 100 }
    );
  });

  it('retorna array vacío si no hay categorías activas', () => {
    const todas = [categoriaValida({ activa: false }), categoriaValida({ activa: false })];
    expect(todas.filter((c) => c.activa)).toHaveLength(0);
  });
});
