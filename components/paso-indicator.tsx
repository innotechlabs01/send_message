import Link from 'next/link';
import { ChevronLeft } from '@/components/icons';

interface PasoIndicatorProps {
  texto?: string;
  href?: string;
}

export default function PasoIndicator({ texto, href }: PasoIndicatorProps) {
  return (
    <div className="mt-8 flex items-center gap-3">
      {href && (
        <Link
          href={href}
          className="flex h-8 w-8 items-center justify-center rounded-screen text-text-tertiary hover:bg-neutral-200"
          aria-label="Atrás"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}
      <span className="text-sm font-medium text-text-tertiary">
        {texto ?? ''}
      </span>
    </div>
  );
}
