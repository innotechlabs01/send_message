import Link from 'next/link';
import { Categoria } from '@/types';

interface CategoryCardProps {
  categoria: Categoria;
}

export default function CategoryCard({ categoria }: CategoryCardProps) {
  return (
    <Link
      href={`/mensajes/${categoria.id}`}
      className="group block"
      aria-label={`Ver mensajes de ${categoria.nombre}`}
    >
      <div className="bg-[#ECECEC] border border-[#CCCCCC] rounded-xl shadow-sm p-6 text-center transition-all duration-150 group-hover:shadow-md group-hover:border-[#4A90D9] group-active:scale-[0.98]">
        <span className="text-4xl block mb-3" aria-hidden="true">
          {categoria.icono}
        </span>
        <span className="text-sm font-medium text-[#333333]">{categoria.nombre}</span>
      </div>
    </Link>
  );
}
