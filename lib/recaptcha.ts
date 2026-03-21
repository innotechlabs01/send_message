interface RecaptchaResult {
  valid: boolean;
  score: number;
}

/** Verifica un token reCAPTCHA v3 con Google */
export async function verifyRecaptcha(
  token: string,
  umbralMinimo = 0.5
): Promise<RecaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn('RECAPTCHA_SECRET_KEY no configurada — omitiendo verificación');
    return { valid: true, score: 1 };
  }

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });

    const data = await res.json();
    const score: number = data.score ?? 0;
    return { valid: data.success === true && score >= umbralMinimo, score };
  } catch {
    return { valid: false, score: 0 };
  }
}
