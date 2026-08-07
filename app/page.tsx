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
    <main className="w-full min-h-screen bg-neutral-100 text-text-primary font-poppins">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-6 pt-12 pb-16">
        {/* Header */}
        <header className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-primary-450">Con</span>
            <span className="text-3xl font-extrabold text-primary-600">Sentido</span>
          </div>
          <div className="relative flex items-center gap-2 rounded-screen bg-white px-3 py-1.5 shadow">
            <span className="sr-only">Carrito</span>
            <svg className="h-5 w-5 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M2.25 8.25h1.343c.525 0 .96-.413 1.09-.928a1.5 1.5 0 0 1 1.06-1.06l.546-.218a.75.75 0 0 1 .954.625v.094c0 .239-.1.295-.414.617l-.332.323a.75.75 0 0 0 0 1.061l.273.273a1.5 1.5 0 0 1 0 2.12l-.53.53a.75.75 0 0 0-.217.526v.258a.75.75 0 0 0 1.28.519l.27-.27a1.5 1.5 0 0 1 2.12 0l.53.53..." />
            </svg>
            <span className="text-sm font-medium text-text-primary">1</span>
          </div>
        </header>

        {/* Hero */}
        <section className="mt-12 w-full text-center">
          <h1 className="text-4xl font-extrabold text-text-primary sm:text-5xl">
            Mensajes únicos generados por IA
          </h1>
          <p className="mt-5 text-lg text-text-secondary max-sm:text-base">
            Las palabras justas para los momentos que importan
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link href="/categorias" className="w-full max-w-sm">
              <Button variante="primary" className="h-13 w-full text-base font-semibold shadow-[0_16px_32px_#2fa5fd]">
                Empezar ahora
              </Button>
            </Link>

            <p className="text-sm text-text-tertiary">
              Envío programado a todo el país
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="mt-16 grid w-full max-w-2xl gap-8 text-center sm:grid-cols-3">
          {[
            { n: 1, titulo: 'Elige la ocasión', desc: 'Cumpleaños, aniversarios, graduaciones y más.' },
            { n: 2, titulo: '5 mensajes con IA', desc: 'Recibe cinco opciones prediseñadas en segundos.' },
            { n: 3, titulo: 'Envía con intención', desc: 'Programa y envía via SMS a quien quieras.' },
          ].map((p) => (
            <div key={p.n} className="flex flex-col items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-450 text-white font-bold">
                {p.n}
              </span>
              <h3 className="text-lg font-semibold text-text-primary">{p.titulo}</h3>
              <p className="text-sm text-text-tertiary">{p.desc}</p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-16 w-full text-center text-sm text-text-tertiary">
          <p>© 2026 ConSentido - Palabras con intención</p>
        </footer>
      </div>
    </main>
  );
}
