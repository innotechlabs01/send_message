import Link from 'next/link';
import { Categoria } from '@/types';

// Paleta de iconos/colores inspirada en el diseño V.3 (colores de iconbox por categoría)
const categoriaEstilos: Record<string, { color: string; emoji: string; tagline: string }> = {
  Cumpleaños: { color: 'rgba(255,129,4,0.10)', emoji: '🎂', tagline: 'Celebrar un año más.' },
  Graduación: { color: 'rgba(59,130,246,0.10)', emoji: '🎓', tagline: 'Un logro académico' },
  Aniversario: { color: 'rgba(239,68,68,0.10)', emoji: '💍', tagline: 'Tiempo compartido' },
  Boda: { color: 'rgba(245,158,11,0.10)', emoji: '💍', tagline: 'Un nuevo comienzo' },
  Nacimiento: { color: 'rgba(34,197,94,0.10)', emoji: '👶', tagline: 'Bienvenida al mundo' },
  Amistad: { color: 'rgba(139,92,245,0.10)', emoji: '🤝', tagline: 'Cariño sincero' },
  Luto: { color: 'rgba(143,255,206,0.12)', emoji: '🕊️', tagline: 'Momento de reflejo' },
  Amor: { color: 'rgba(244,114,182,0.10)', emoji: '❤️', tagline: 'Amor sincero' },
};

interface CategoryCardProps {
  categoria: Categoria;
  seleccionada?: boolean;
}

export default function CategoryCard({ categoria, seleccionada = false }: CategoryCardProps) {
  const estilo = categoriaEstilos[categoria.nombre] ?? { color: 'rgba(34,105,237,0.10)', emoji: categoria.icono || '🎉', tagline: 'Palabras con intención' };

  return (
    <Link
      href={`/mensajes/${categoria.id}`}
      className={`group block no-underline`}
      aria-label={`Ver mensajes de ${categoria.nombre}`}
    >
      <div
        className={`
          relative w-full h-[185px] bg-white rounded-[24px] border transition-all duration-150
          ${seleccionada
            ? 'border-primary-450 ring-2 ring-primary-200 shadow-hover'
            : 'border-[#E8E8E8] hover:border-[#6C9BF3] hover:shadow-hover'}
          active:scale-[0.98]
        `}
      >
        <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: estilo.color }}>
          <span className="text-xl" aria-hidden="true">{estilo.emoji}</span>
        </div>
        <div className="absolute left-4 top-16 w-[220px]">
          <h3 className="font-semibold text-[17px] leading-tight text-text-primary mb-1">{categoria.nombre}</h3>
          <p className="text-xs text-text-tertiary leading-snug">{estilo.tagline}</p>
        </div>
      </div>
    </Link>
  );
}
