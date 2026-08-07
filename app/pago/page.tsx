'use client';

import PaymentSummary from '@/components/PaymentSummary';
import HeaderBrand from '@/components/header-brand';
import PasoIndicator from '@/components/paso-indicator';

export default function PaginaPago() {
  return (
    <main className="w-full min-h-screen bg-neutral-100 text-text-primary font-poppins">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-6 pt-10 pb-16">
        <HeaderBrand />
        <PasoIndicator texto="Paso 4 / 4" href="/envio" />

        <section className="mt-8">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Checkout</h1>
          <p className="mt-2 text-base text-text-secondary">
            Completa tus datos básicos. Te llevaremos a la pasarela segura para finalizar.
          </p>
        </section>

        <section className="mt-8 w-full max-w-lg">
          <PaymentSummary />
        </section>

        <footer className="mt-12 text-center text-sm text-text-tertiary">
          <p>© 2026 ConSentido - Palabras con intención</p>
        </footer>
      </div>
    </main>
  );
}
