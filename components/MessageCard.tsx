'use client';

import { MensajePrediseniado } from '@/types';
import Button from '@/components/ui/Button';

// Iconos por categoría (inspirado en el diseño V.3, fallback por emoji)
const iconosCategoria: Record<string, React.ReactNode> = {
  Cumpleaños: <Icono type="cumple" />,
  Graduación: <Icono type="graduacion" />,
  Aniversario: <Icono type="aniversario" />,
  Boda: <Icono type="boda" />,
  Nacimiento: <Icono type="nacimiento" />,
  Amistad: <Icono type="amistad" />,
  Luto: <Icono type="luto" />,
  Amor: <Icono type="amor" />,
};

function Icono({ type }: { type: string }) {
  const mapa: Record<string, React.ReactNode> = {
    cumple: <GiftIcon />,
    graduacion: <GraduacionIcon />,
    aniversario: <AnilloIcon />,
    boda: <AnilloIcon />,
    nacimiento: <BabyIcon />,
    amistad: <CorazonIcon />,
    luto: <PazIcon />,
    amor: <CorazonIcon />,
  };
  return mapa[type] ?? null;
}

function GiftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 8h-2.5a3.5 3.5 0 0 0-6.9 0H5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3Z" stroke="#2269ED" strokeWidth="2" />
      <path d="M12 14v-4m-2 2h4" stroke="#2269ED" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function GraduacionIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3 3 8v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8l-9-5Z" stroke="#2269ED" strokeWidth="2" /><path d="M9 12l3 2 6-4" stroke="#2269ED" strokeWidth="2" /></svg>;
}
function AnilloIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 8v8m-3-4h6" stroke="#2269ED" strokeWidth="2" /><circle cx="12" cy="12" r="7" stroke="#2269ED" strokeWidth="2" /></svg>;
}
function BabyIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#2269ED" strokeWidth="2" /><path d="M8 12a4 4 0 0 1 8 0" stroke="#2269ED" strokeWidth="2" /></svg>;
}
function CorazonIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5l-1 1-2-2a4 4 0 0 0-6 3 6 6 0 0 0 2 4l6 6 6-6a6 6 0 0 0 2-4 4 4 0 0 0-6-3Z" stroke="#2269ED" strokeWidth="2" /></svg>;
}
function PazIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v8m-4-4 4 4 4-4" stroke="#2269ED" strokeWidth="2" /></svg>;
}

interface MessageCardProps {
  mensaje: MensajePrediseniado;
  indice?: number;
  categoria?: string;
  onSeleccionar: (mensaje: MensajePrediseniado) => void;
}

export default function MessageCard({ mensaje, indice = 0, categoria, onSeleccionar }: MessageCardProps) {
  const iconoCat = iconosCategoria[categoria ?? ''];
  return (
    <div
      className="relative w-full h-[74px] bg-white rounded-[24px] border border-[#E8E8E8] shadow-xs overflow-hidden
                 flex items-center gap-3 px-4 transition-all duration-150
                 hover:border-[#6C9BF3] hover:shadow-hover active:scale-[0.98]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-450">
        {iconoCat ?? <span className="text-xl" aria-hidden="true">{mensaje.texto ? '💌' : ''}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-text-secondary">
          {indice + 1}
        </span>
        <p className="text-sm text-text-secondary line-clamp-2">
          {mensaje.texto}
        </p>
      </div>
      <Button
        variante="primary"
        onClick={() => onSeleccionar(mensaje)}
        className="ml-auto h-7 rounded-screen px-3 py-1"
        aria-label={`Seleccionar este mensaje`}
      >
        Seleccionar
      </Button>
    </div>
  );
}

export const MensajesLista = () => null;
