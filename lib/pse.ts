import crypto from 'crypto';

interface PSESessionParams {
  referencia: string;
  monto: number;
  descripcion: string;
  returnUrl: string;
  ipAddress: string;
  userAgent: string;
}

interface PSESessionResponse {
  checkoutUrl: string;
  requestId: string;
  status: string;
}

/** Genera la autenticación HMAC-SHA1 para PlacetoPay */
function generarAuth(): { login: string; nonce: string; seed: string; tranKey: string } {
  const login = process.env.PSE_LOGIN!;
  const secretKey = process.env.PSE_SECRET_KEY!;
  const seed = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString('base64');
  const rawTranKey = `${nonce}${seed}${secretKey}`;
  const tranKey = crypto.createHash('sha256').update(rawTranKey).digest('base64');

  return { login, nonce, seed, tranKey };
}

/** Crea una sesión de pago en PlacetoPay */
export async function createSession(params: PSESessionParams): Promise<PSESessionResponse> {
  const baseUrl = process.env.PSE_BASE_URL!;
  const auth = generarAuth();

  const body = {
    auth,
    payment: {
      reference: params.referencia,
      description: params.descripcion,
      amount: { currency: 'COP', total: params.monto },
    },
    expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    returnUrl: params.returnUrl,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`PSE respondió con status ${res.status}`);
    }

    const data = await res.json();
    return {
      checkoutUrl: data.processUrl,
      requestId: String(data.requestId),
      status: data.status?.status ?? 'PENDING',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Verifica la firma HMAC-SHA256 del webhook de PlacetoPay */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');

  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
