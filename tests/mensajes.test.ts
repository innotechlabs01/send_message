import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MensajePrediseniado } from '@/types';

function mensajeValido(overrides: Partial<MensajePrediseniado> = {}): MensajePrediseniado {
  return {
    id: crypto.randomUUID(),
    categoria_id: crypto.randomUUID(),
    texto: 'Hola {destinatario}, feliz cumpleaños de parte de {remitente}.',
    activo: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Simula la lógica del selector de 5 mensajes aleatorios */
function seleccionar5(mensajes: MensajePrediseniado[], excluir: string[]): MensajePrediseniado[] {
  const disponibles = mensajes.filter((m) => m.activo && !excluir.includes(m.id));
  return [...disponibles].sort(() => Math.random() - 0.5).slice(0, 5);
}

/** Construye el mensaje personalizado */
function construirMensaje(texto: string, destinatario: string, remitente: string): string {
  const cuerpo = texto
    .replace(/\{destinatario\}/gi, destinatario)
    .replace(/\{remitente\}/gi, remitente);
  return `Hola ${destinatario}\n\n${cuerpo}\n\nEste mensaje es enviado por ${remitente}`;
}

describe('Selector de mensajes', () => {
  it('retorna máximo 5 mensajes', () => {
    const mensajes = Array.from({ length: 20 }, () => mensajeValido());
    const resultado = seleccionar5(mensajes, []);
    expect(resultado.length).toBeLessThanOrEqual(5);
  });

  it('retorna exactamente 5 cuando hay suficientes', () => {
    const mensajes = Array.from({ length: 20 }, () => mensajeValido());
    expect(seleccionar5(mensajes, [])).toHaveLength(5);
  });

  it('excluye los IDs indicados', () => {
    const mensajes = Array.from({ length: 10 }, () => mensajeValido());
    const excluir = mensajes.slice(0, 3).map((m) => m.id);
    const resultado = seleccionar5(mensajes, excluir);
    const idsResultado = resultado.map((m) => m.id);
    excluir.forEach((id) => expect(idsResultado).not.toContain(id));
  });

  it('propiedad: nunca retorna más de 5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        (n) => {
          const mensajes = Array.from({ length: n }, () => mensajeValido());
          return seleccionar5(mensajes, []).length <= 5;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('propiedad: los resultados no contienen IDs excluidos', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 20 }),
        fc.integer({ min: 0, max: 5 }),
        (total, nExcluir) => {
          const mensajes = Array.from({ length: total }, () => mensajeValido());
          const excluir = mensajes.slice(0, nExcluir).map((m) => m.id);
          const resultado = seleccionar5(mensajes, excluir);
          return resultado.every((m) => !excluir.includes(m.id));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Construcción del mensaje personalizado', () => {
  it('reemplaza {destinatario} y {remitente}', () => {
    const texto = 'Hola {destinatario}, de parte de {remitente}.';
    const resultado = construirMensaje(texto, 'María', 'Carlos');
    expect(resultado).toContain('María');
    expect(resultado).toContain('Carlos');
    expect(resultado).not.toContain('{destinatario}');
    expect(resultado).not.toContain('{remitente}');
  });

  it('tiene tres secciones separadas por doble salto de línea', () => {
    const resultado = construirMensaje('Texto del mensaje.', 'Ana', 'Luis');
    const partes = resultado.split('\n\n');
    expect(partes.length).toBeGreaterThanOrEqual(3);
  });

  it('empieza con "Hola {nombre}"', () => {
    const resultado = construirMensaje('Texto.', 'Pedro', 'Juan');
    expect(resultado.startsWith('Hola Pedro')).toBe(true);
  });

  it('termina con la firma del remitente', () => {
    const resultado = construirMensaje('Texto.', 'Ana', 'Luis');
    expect(resultado).toContain('Este mensaje es enviado por Luis');
  });

  it('propiedad: siempre contiene el nombre del destinatario', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (dest, rem) => {
          const resultado = construirMensaje('Texto de prueba.', dest, rem);
          return resultado.includes(dest);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('propiedad: siempre contiene el nombre del remitente', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (dest, rem) => {
          const resultado = construirMensaje('Texto de prueba.', dest, rem);
          return resultado.includes(rem);
        }
      ),
      { numRuns: 100 }
    );
  });
});
