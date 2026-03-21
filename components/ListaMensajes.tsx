'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MensajePrediseniado } from '@/types';
import MessageCard from '@/components/MessageCard';
import Button from '@/components/ui/Button';

interface ListaMensajesProps {
  mensajesIniciales: MensajePrediseniado[];
  categoriaId: string;
}

export default function ListaMensajes({ mensajesIniciales, categoriaId }: ListaMensajesProps) {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<MensajePrediseniado[]>(mensajesIniciales);
  const [idsVistos, setIdsVistos] = useState<string[]>(mensajesIniciales.map((m) => m.id));
  const [cargando, setCargando] = useState(false);
  const [sinMas, setSinMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verOtros = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        categoria: categoriaId,
        excluir: idsVistos.join(','),
      });
      const res = await fetch(`/api/mensajes/prediseniados?${params}`);
      const json = await res.json();

      if (!res.ok || 'error' in json) {
        if (res.status === 404) {
          setSinMas(true);
        } else {
          setError('No se pudieron cargar más mensajes. Intenta de nuevo.');
        }
        return;
      }

      const nuevos: MensajePrediseniado[] = json.data;
      setMensajes(nuevos);
      setIdsVistos((prev) => [...prev, ...nuevos.map((m) => m.id)]);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [categoriaId, idsVistos]);

  const seleccionar = useCallback((mensaje: MensajePrediseniado) => {
    // Guardar en sessionStorage para la siguiente pantalla
    sessionStorage.setItem('mensaje_seleccionado', JSON.stringify(mensaje));
    router.push('/personalizar');
  }, [router]);

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-red-600 text-sm text-center">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-label="Mensajes disponibles">
        {mensajes.map((m) => (
          <li key={m.id}>
            <MessageCard mensaje={m} onSeleccionar={seleccionar} />
          </li>
        ))}
      </ul>

      <div className="flex justify-center">
        {sinMas ? (
          <p className="text-sm text-[#666666]">No hay más mensajes en esta categoría.</p>
        ) : (
          <Button variante="secondary" onClick={verOtros} cargando={cargando} disabled={cargando}>
            Ver otros 5
          </Button>
        )}
      </div>
    </div>
  );
}
