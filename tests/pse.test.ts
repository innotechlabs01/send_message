import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyWebhookSignature } from '@/lib/pse';

function firmar(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

describe('verifyWebhookSignature', () => {
  const secret = 'mi-secreto-de-prueba';
  const payload = JSON.stringify({ status: { status: 'APPROVED' }, reference: 'REF-001' });

  it('acepta firma válida', () => {
    const firma = firmar(payload, secret);
    expect(verifyWebhookSignature(payload, firma, secret)).toBe(true);
  });

  it('rechaza firma inválida', () => {
    expect(verifyWebhookSignature(payload, 'firma-incorrecta-hex00', secret)).toBe(false);
  });

  it('rechaza payload alterado', () => {
    const firma = firmar(payload, secret);
    const payloadAlterado = payload + ' ';
    expect(verifyWebhookSignature(payloadAlterado, firma, secret)).toBe(false);
  });

  it('rechaza secret incorrecto', () => {
    const firma = firmar(payload, secret);
    expect(verifyWebhookSignature(payload, firma, 'otro-secreto')).toBe(false);
  });

  it('rechaza firma vacía', () => {
    expect(verifyWebhookSignature(payload, '', secret)).toBe(false);
  });

  it('propiedad: firma generada con el mismo secret siempre es válida', () => {
    const payloads = ['{}', '{"a":1}', payload, 'texto plano'];
    payloads.forEach((p) => {
      const firma = firmar(p, secret);
      expect(verifyWebhookSignature(p, firma, secret)).toBe(true);
    });
  });
});
