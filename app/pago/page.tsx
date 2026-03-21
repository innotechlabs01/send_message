import type { Metadata } from 'next';
import PaymentSummary from '@/components/PaymentSummary';

export const metadata: Metadata = {
  title: 'Pago seguro',
  description: 'Completa el pago de tu mensaje programado de forma segura con PSE.',
  robots: { index: false, follow: false },
};

export default function PaginaPago() {
  return (
    <main className="min-h-screen px-4 py-12 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#333333] mb-2">Pago seguro</h1>
        <p className="text-[#666666] text-sm">
          Revisa el resumen y completa el pago para programar tu mensaje.
        </p>
      </div>
      <PaymentSummary />
    </main>
  );
}
