import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { celularColombiano, crearMensajeSchema, personalizarSchema } from '@/lib/validations';

describe('celularColombiano', () => {
  it('acepta números válidos que empiezan en 3 con 10 dígitos', () => {
    expect(celularColombiano.safeParse('3001234567').success).toBe(true);
    expect(celularColombiano.safeParse('3219876543').success).toBe(true);
  });

  it('transforma el número agregando +57', () => {
    const result = celularColombiano.safeParse('3001234567');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('+573001234567');
    }
  });

  it('rechaza números que no empiezan en 3', () => {
    expect(celularColombiano.safeParse('2001234567').success).toBe(false);
    expect(celularColombiano.safeParse('1234567890').success).toBe(false);
  });

  it('rechaza números con menos de 10 dígitos', () => {
    expect(celularColombiano.safeParse('300123456').success).toBe(false);
  });

  it('rechaza números con más de 10 dígitos', () => {
    expect(celularColombiano.safeParse('30012345678').success).toBe(false);
  });

  it('rechaza strings con letras', () => {
    expect(celularColombiano.safeParse('300123456a').success).toBe(false);
  });

  it('propiedad: todo número de 10 dígitos que empieza en 3 es válido y se transforma', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^3[0-9]{9}$/),
        (num) => {
          const result = celularColombiano.safeParse(num);
          return result.success === true && result.data === `+57${num}`;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('propiedad: números que no empiezan en 3 son inválidos', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-24-9][0-9]{9}$/),
        (num) => celularColombiano.safeParse(num).success === false
      ),
      { numRuns: 100 }
    );
  });
});

describe('personalizarSchema', () => {
  it('acepta nombres válidos', () => {
    const r = personalizarSchema.safeParse({ nombre_destinatario: 'María', nombre_remitente: 'Carlos' });
    expect(r.success).toBe(true);
  });

  it('rechaza nombres vacíos', () => {
    expect(personalizarSchema.safeParse({ nombre_destinatario: '', nombre_remitente: 'Carlos' }).success).toBe(false);
    expect(personalizarSchema.safeParse({ nombre_destinatario: 'María', nombre_remitente: '' }).success).toBe(false);
  });

  it('rechaza nombres mayores a 100 caracteres', () => {
    const largo = 'a'.repeat(101);
    expect(personalizarSchema.safeParse({ nombre_destinatario: largo, nombre_remitente: 'Carlos' }).success).toBe(false);
  });
});

describe('crearMensajeSchema', () => {
  const base = {
    nombre_destinatario: 'María',
    nombre_remitente: 'Carlos',
    texto_final: 'Hola María, feliz cumpleaños',
    celular_destinatario: '3001234567',
    celular_remitente: '3009876543',
    fecha_envio: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  };

  it('acepta datos válidos', () => {
    expect(crearMensajeSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza fecha pasada', () => {
    const r = crearMensajeSchema.safeParse({ ...base, fecha_envio: '2020-01-01' });
    expect(r.success).toBe(false);
  });

  it('rechaza celular que no es de Colombia', () => {
    const r = crearMensajeSchema.safeParse({ ...base, celular_destinatario: '1234567890' });
    expect(r.success).toBe(false);
  });

  it('rechaza texto vacío', () => {
    const r = crearMensajeSchema.safeParse({ ...base, texto_final: '' });
    expect(r.success).toBe(false);
  });
});
