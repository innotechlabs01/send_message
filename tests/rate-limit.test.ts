import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { maskPhone } from '@/lib/api-auth';

// Tests de enmascaramiento (complementan api-auth.test.ts)
describe('maskPhone — propiedad de privacidad', () => {
  it('nunca expone los primeros 6 dígitos de un celular colombiano', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^3[0-9]{9}$/),
        (phone) => {
          const masked = maskPhone(phone);
          // Los primeros 6 caracteres deben ser ******
          return masked.slice(0, 6) === '******';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('propiedad: la longitud del resultado es siempre 10 para celulares de 10 dígitos', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^3[0-9]{9}$/),
        (phone) => maskPhone(phone).length === 10
      ),
      { numRuns: 100 }
    );
  });

  it('propiedad: los últimos 4 dígitos son siempre visibles', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^3[0-9]{9}$/),
        (phone) => {
          const masked = maskPhone(phone);
          return masked.slice(-4) === phone.slice(-4);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Tests de lógica de rutas para rate limiting
describe('Identificación de rutas para rate limiting', () => {
  function esRutaB2B(pathname: string): boolean {
    return pathname.startsWith('/api/v1/');
  }

  it('identifica rutas B2B correctamente', () => {
    expect(esRutaB2B('/api/v1/mensajes')).toBe(true);
    expect(esRutaB2B('/api/v1/mensajes/123')).toBe(true);
    expect(esRutaB2B('/api/mensajes/prediseniados')).toBe(false);
    expect(esRutaB2B('/api/pago/iniciar')).toBe(false);
    expect(esRutaB2B('/')).toBe(false);
  });

  it('propiedad: rutas que empiezan con /api/v1/ son siempre B2B', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 30 }),
        (sufijo) => esRutaB2B(`/api/v1/${sufijo}`) === true
      ),
      { numRuns: 50 }
    );
  });
});
