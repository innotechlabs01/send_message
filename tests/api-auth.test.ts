import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { maskPhone } from '@/lib/api-auth';

describe('maskPhone', () => {
  it('enmascara los primeros 6 dígitos', () => {
    expect(maskPhone('3001234567')).toBe('******4567');
    expect(maskPhone('3219876543')).toBe('******6543');
  });

  it('retorna ****** para strings cortos', () => {
    expect(maskPhone('123')).toBe('******');
    expect(maskPhone('')).toBe('******');
  });

  it('propiedad: siempre empieza con ******', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 15 }),
        (phone) => maskPhone(phone).startsWith('******')
      ),
      { numRuns: 100 }
    );
  });

  it('propiedad: los últimos 4 caracteres del resultado coinciden con los últimos 4 del input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 15 }),
        (phone) => {
          const masked = maskPhone(phone);
          return masked.endsWith(phone.slice(-4));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('propiedad: la longitud del resultado es siempre 10 para inputs de 10 dígitos', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^3[0-9]{9}$/),
        (phone) => maskPhone(phone).length === 10
      ),
      { numRuns: 100 }
    );
  });
});
