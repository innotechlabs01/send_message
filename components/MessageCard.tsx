'use client';

import { MensajePrediseniado } from '@/types';
import Button from '@/components/ui/Button';

interface MessageCardProps {
  mensaje: MensajePrediseniado;
  onSeleccionar: (mensaje: MensajePrediseniado) => void;
}

export default function MessageCard({ mensaje, onSeleccionar }: MessageCardProps) {
  return (
    <div className="bg-[#ECECEC] border border-[#CCCCCC] rounded-xl shadow-sm p-5 flex flex-col gap-4">
      <p className="text-[#333333] text-sm leading-relaxed whitespace-pre-line flex-1">
        {mensaje.texto}
      </p>
      <Button
        variante="primary"
        onClick={() => onSeleccionar(mensaje)}
        className="w-full"
        aria-label={`Seleccionar este mensaje`}
      >
        Seleccionar
      </Button>
    </div>
  );
}
