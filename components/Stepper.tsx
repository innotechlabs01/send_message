'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

interface Step {
  label: string;
  path: string;
  numero: number;
}

const pasos: Step[] = [
  { label: 'Personalizar', path: '/personalizar', numero: 1 },
  { label: 'Envío', path: '/envio', numero: 2 },
  { label: 'Pago', path: '/pago', numero: 3 },
];

function tieneDatosRequeridos(numeroPaso: number): boolean {
  const datos = sessionStorage.getItem('datos_envio');
  if (!datos) return false;

  try {
    const parsed = JSON.parse(datos);
    
    if (numeroPaso === 1) {
      return true;
    }
    if (numeroPaso === 2) {
      return !!parsed.texto_final;
    }
    if (numeroPaso === 3) {
      return !!parsed.fecha_envio;
    }
    return false;
  } catch {
    return false;
  }
}

export default function Stepper() {
  const pathname = usePathname();
  const { showToast } = useToast();

  const pasoActual = pasos.findIndex(p => pathname?.startsWith(p.path)) + 1 || 0;

  const puedeIrAPaso = (numeroPaso: number): boolean => {
    if (numeroPaso <= pasoActual) return true;
    return tieneDatosRequeridos(numeroPaso);
  };

  const handleClick = (e: React.MouseEvent, paso: Step) => {
    if (!puedeIrAPaso(paso.numero)) {
      e.preventDefault();
      if (paso.numero === 2) {
        showToast('Primero personaliza tu mensaje', 'warning');
      } else if (paso.numero === 3) {
        showToast('Primero completa los datos de envío', 'warning');
      }
    }
  };

  return (
    <nav aria-label="Progreso de compra" className="w-full">
      <ol className="flex items-center justify-center">
        {pasos.map((paso, index) => {
          const isActive = paso.numero === pasoActual;
          const isCompleted = paso.numero < pasoActual;

          return (
            <li key={paso.path} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                {isCompleted ? (
                  <Link
                    href={paso.path}
                    onClick={(e) => handleClick(e, paso)}
                    className="flex items-center justify-center w-10 h-10 rounded-full 
                      bg-success-400 text-white 
                      transition-all duration-200
                      hover:bg-success-600 hover:scale-110
                      active:scale-95
                      shadow-sm hover:shadow-md"
                    aria-label={`${paso.label} - Completado`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </Link>
                ) : isActive ? (
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-full 
                      bg-primary-400 text-white font-bold 
                      ring-4 ring-primary-100
                      shadow-md"
                    aria-current="step"
                  >
                    {paso.numero}
                  </span>
                ) : (
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-full 
                      bg-surface-tertiary text-text-tertiary font-semibold
                      border-2 border-dashed border-text-disabled"
                  >
                    {paso.numero}
                  </span>
                )}

                <span
                  className={`text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-primary-500 font-bold'
                      : isCompleted
                      ? 'text-success-600'
                      : 'text-text-tertiary'
                  }`}
                >
                  {paso.label}
                </span>
              </div>

              {index < pasos.length - 1 && (
                <div className="w-8 sm:w-12 mx-1 sm:mx-2">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-success-400' : 'bg-surface-tertiary'
                    }`}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
