import Link from 'next/link';

export default function HeaderBrand() {
  return (
    <header className="flex w-full items-center justify-between">
      <Link href="/" className="flex items-center gap-3">
        <span className="text-2xl font-extrabold text-primary-450">Con</span>
        <span className="text-2xl font-extrabold text-primary-600">Sentido</span>
      </Link>
      <div className="relative flex items-center gap-2 rounded-screen bg-white px-3 py-1.5 shadow">
        <span className="sr-only">Carrito</span>
        <svg className="h-5 w-5 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M2.25 8.25h1.343c.525 0 .96-.413 1.09-.928a1.5 1.5 0 0 1 1.06-1.06l.546-.218a.75.75 0 0 1 .954.625v.094c0 .239-.1.295-.414.617l-.332.323a.75.75 0 0 0 0 1.061l.273.273a1.5 1.5 0 0 1 0 2.12l-.53.53a.75.75 0 0 0-.217.526v.258a.75.75 0 0 0 1.28.519l.27-.27a1.5 1.5 0 0 1 2.12 0l.53.53a.75.75 0 0 1 .525.519v.668c0 .414.336.75.75.75H19.5a1.5 1.5 0 0 0 1.5-1.5v-4.5a3 3 0 0 0-3-3H7.5" />
        </svg>
        <span className="text-sm font-medium text-text-primary">1</span>
      </div>
    </header>
  );
}
