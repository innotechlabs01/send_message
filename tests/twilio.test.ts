import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { buildMessageBody } from '@/lib/twilio';

describe('buildMessageBody', () => {
  it('construye el mensaje con tres secciones', () => {
    const resultado = buildMessageBody('Texto del mensaje.', 'María', 'Carlos');
    const partes = resultado.split('\n\n');
    expect(partes.length).toBeGreaterThanOrEqual(3);
  });

  it('reemplaza {destinatario} en el texto', () => {
    const resultado = buildMessageBody('Hola {destinatario}!', 'Ana', 'Luis');
    expect(resultado).toContain('Ana');
    expect(resultado).not.toContain('{destinatario}');
  });

  it('reemplaza {remitente} en el texto', () => {
    const resultado = buildMessageBody('De {remitente} con amor.', 'Ana', 'Luis');
    expect(resultado).toContain('Luis');
    expect(resultado).not.toContain('{remitente}');
  });

  it('empieza con "Hola {nombre}"', () => {
    const resultado = buildMessageBody('Texto.', 'Pedro', 'Juan');
    expect(resultado.startsWith('Hola Pedro')).toBe(true);
  });

  it('termina con la firma del remitente', () => {
    const resultado = buildMessageBody('Texto.', 'Ana', 'Luis');
    expect(resultado.endsWith('Este mensaje es enviado por Luis')).toBe(true);
  });

  it('propiedad: siempre contiene destinatario y remitente', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        (dest, rem, texto) => {
          const resultado = buildMessageBody(texto, dest, rem);
          return resultado.includes(dest) && resultado.includes(rem);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('propiedad: el resultado siempre tiene al menos 3 partes separadas por \\n\\n', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        (dest, rem, texto) => {
          const resultado = buildMessageBody(texto, dest, rem);
          return resultado.split('\n\n').length >= 3;
        }
      ),
      { numRuns: 100 }
    );
  });
});
