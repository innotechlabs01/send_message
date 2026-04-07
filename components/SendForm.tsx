'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { enviarDatosSchema } from '@/lib/validations';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface SendFormProps {
  datosIniciales: {
    texto_final: string;
    nombre_destinatario: string;
    nombre_remitente: string;
  };
}

interface Errores {
  fecha_envio?: string;
  celular_destinatario?: string;
  celular_remitente?: string;
}

export default function SendForm({ datosIniciales }: SendFormProps) {
  const router = useRouter();
  const [fechaEnvio, setFechaEnvio] = useState('');
  const [celularDestinatario, setCelularDestinatario] = useState('');
  const [celularRemitente, setCelularRemitente] = useState('');
  const [errores, setErrores] = useState<Errores>({});

  // Fecha mínima: hoy (usando zona horaria local, no UTC)
  const hoy = new Date().toLocaleDateString('en-CA');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const campos: Errores = {};

    if (celularDestinatario.length > 0 && !celularDestinatario.startsWith('3')) {
      campos.celular_destinatario = 'Aún no tenemos disponible el servicio fuera de Colombia';
    }
    if (celularRemitente.length > 0 && !celularRemitente.startsWith('3')) {
      campos.celular_remitente = 'Aún no tenemos disponible el servicio fuera de Colombia';
    }

    if (Object.keys(campos).length > 0) {
      setErrores(campos);
      return;
    }

    const resultado = enviarDatosSchema.safeParse({
      ...datosIniciales,
      fecha_envio: fechaEnvio,
      celular_destinatario: celularDestinatario,
      celular_remitente: celularRemitente,
    });

    if (!resultado.success) {
      const campos: Errores = {};
      resultado.error.issues.forEach((err) => {
        const campo = err.path[0] as keyof Errores;
        if (campo in { fecha_envio: 1, celular_destinatario: 1, celular_remitente: 1 }) {
          campos[campo] = err.message;
        }
      });
      setErrores(campos);
      return;
    }

    setErrores({});
    // Guardar todos los datos en sessionStorage y navegar a pago
    sessionStorage.setItem('datos_envio', JSON.stringify(resultado.data));
    router.push('/pago');
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Input
        label="Fecha de envío"
        type="date"
        min={hoy}
        value={fechaEnvio}
        onChange={(e) => setFechaEnvio(e.target.value)}
        error={errores.fecha_envio}
        hint="El mensaje se enviará en esta fecha"
      />
      <Input
        label="Celular del destinatario"
        type="tel"
        placeholder="3001234567"
        maxLength={10}
        value={celularDestinatario}
        onChange={(e) => setCelularDestinatario(e.target.value.replace(/\D/g, ''))}
        error={errores.celular_destinatario}
        hint="10 dígitos, empieza en 3"
        inputMode="numeric"
      />
      <Input
        label="Tu celular (para recordatorio)"
        type="tel"
        placeholder="3009876543"
        maxLength={10}
        value={celularRemitente}
        onChange={(e) => setCelularRemitente(e.target.value.replace(/\D/g, ''))}
        error={errores.celular_remitente}
        hint="10 dígitos, empieza en 3"
        inputMode="numeric"
      />
      <Button type="submit" variante="primary" className="w-full mt-2">
        Continuar al pago
      </Button>
    </form>
  );
}
