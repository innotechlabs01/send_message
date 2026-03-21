import crypto from 'crypto';

/**
 * Genera el hash de integridad SHA-256 requerido por Bold
 * Formato: SHA256(orderId + amount + currency + secretKey)
 */
export function generarIntegrityHash(
  orderId: string,
  amount: number,
  currency: string,
  secretKey: string
): string {
  const cadena = `${orderId}${amount}${currency}${secretKey}`;
  return crypto.createHash('sha256').update(cadena).digest('hex');
}

/**
 * Retorna las credenciales Bold según el scope del entorno.
 * En local/qa usa las llaves de prueba, en production las reales.
 */
export function getBoldCredentials(): { apiKey: string; secretKey: string } {
  const scope = process.env.APP_SCOPE ?? 'development';
  const isProd = scope === 'production';

  return {
    apiKey: isProd
      ? process.env.BOLD_API_KEY_PROD!
      : process.env.BOLD_API_KEY_TEST!,
    secretKey: isProd
      ? process.env.BOLD_SECRET_KEY_PROD!
      : process.env.BOLD_SECRET_KEY_TEST!,
  };
}
