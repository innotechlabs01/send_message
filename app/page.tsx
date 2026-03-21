import type { Metadata } from 'next';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'ConSentido — Mensajes con corazón',
  description:
    'Envía mensajes personalizados y programados para cumpleaños, aniversarios y momentos especiales. Elige entre cientos de mensajes prediseñados.',
  openGraph: {
    title: 'ConSentido — Mensajes con corazón',
    description: 'Envía mensajes personalizados y programados para los momentos que importan.',
    url: '/',
  },
};

export default function PaginaBienvenida() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-[#EBF4FF] to-white">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo / Ícono */}
        <div className="flex justify-center">
          <div
            className="w-24 h-24 rounded-full bg-[#4A90D9] flex items-center justify-center shadow-lg"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-[#333333] tracking-tight">ConSentido</h1>
          <p className="text-lg text-[#666666] leading-relaxed">
            Envía mensajes con corazón para los momentos que importan.
            <br />
            Cumpleaños, aniversarios y mucho más.
          </p>
        </div>

        {/* CTA */}
        <div className="pt-4">
          <Link href="/categorias" className="block">
            <Button variante="primary" className="w-full text-base py-3">
              Crear nuevo mensaje
            </Button>
          </Link>
        </div>

        {/* Características */}
        <ul className="grid grid-cols-3 gap-4 pt-4 text-sm text-[#666666]" aria-label="Características">
          {[
            { icono: '✉️', texto: 'Mensajes prediseñados' },
            { icono: '⏰', texto: 'Envío programado' },
            { icono: '📱', texto: 'Vía SMS' },
          ].map(({ icono, texto }) => (
            <li key={texto} className="flex flex-col items-center gap-1">
              <span className="text-2xl" aria-hidden="true">{icono}</span>
              <span>{texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
