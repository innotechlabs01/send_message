import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Hashea una API Key con SHA-256 para comparación segura */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** Valida una API Key y retorna el empresa_id si es válida */
export async function validateApiKey(key: string): Promise<string | null> {
  if (!key || key.trim().length === 0) return null;

  const hash = hashApiKey(key);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('api_keys')
    .select('empresa_id, activa')
    .eq('key_hash', hash)
    .single();

  if (error || !data || !data.activa) return null;
  return data.empresa_id as string;
}

/** Enmascara un número de celular mostrando solo los últimos 4 dígitos */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '******';
  return `******${phone.slice(-4)}`;
}
