'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function PaginaAuth() {
  const router = useRouter();
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^3[0-9]{9}$/.test(telefono)) {
      setError('Ingresa un celular colombiano válido (10 dígitos, empieza en 3)');
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: `+57${telefono}`,
    });

    if (err) {
      setError('No se pudo enviar el código. Intenta de nuevo.');
      setCargando(false);
      return;
    }

    sessionStorage.setItem('otp_phone', `+57${telefono}`);
    router.push('/auth/verificar');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#333333] mb-2">Ingresa tu celular</h1>
          <p className="text-[#666666] text-sm">
            Te enviaremos un código de verificación por SMS.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Input
            label="Número de celular"
            type="tel"
            placeholder="3001234567"
            maxLength={10}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
            error={error}
            hint="10 dígitos, empieza en 3"
            inputMode="numeric"
          />
          <Button type="submit" variante="primary" className="w-full" disabled={cargando}>
            {cargando ? 'Enviando...' : 'Enviar código'}
          </Button>
        </form>
      </div>
    </main>
  );
}
