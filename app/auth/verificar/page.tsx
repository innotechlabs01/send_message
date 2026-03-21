'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function PaginaVerificar() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const phone = sessionStorage.getItem('otp_phone');
    if (!phone) {
      router.replace('/auth');
      return;
    }
    setTelefono(phone);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(codigo)) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.verifyOtp({
      phone: telefono,
      token: codigo,
      type: 'sms',
    });

    if (err) {
      setError('Código incorrecto o expirado. Intenta de nuevo.');
      setCargando(false);
      return;
    }

    sessionStorage.removeItem('otp_phone');
    // Redirigir al flujo que estaba siguiendo o a categorías
    const destino = sessionStorage.getItem('auth_redirect') ?? '/categorias';
    sessionStorage.removeItem('auth_redirect');
    router.replace(destino);
  };

  const handleReenviar = async () => {
    if (!telefono) return;
    const supabase = createClient();
    await supabase.auth.signInWithOtp({ phone: telefono });
    setError('');
    setCodigo('');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#333333] mb-2">Verifica tu código</h1>
          <p className="text-[#666666] text-sm">
            Ingresa el código de 6 dígitos que enviamos a{' '}
            <span className="font-medium text-[#333333]">{telefono}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Input
            label="Código de verificación"
            type="text"
            placeholder="123456"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            error={error}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <Button type="submit" variante="primary" className="w-full" disabled={cargando}>
            {cargando ? 'Verificando...' : 'Verificar'}
          </Button>
        </form>

        <p className="text-center text-sm text-[#666666]">
          ¿No recibiste el código?{' '}
          <button
            type="button"
            onClick={handleReenviar}
            className="text-[#4A90D9] hover:underline"
          >
            Reenviar
          </button>
        </p>
      </div>
    </main>
  );
}
