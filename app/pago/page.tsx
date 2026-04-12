'use client';

import PaymentSummary from '@/components/PaymentSummary';
import Stepper from '@/components/Stepper';

export default function PaginaPago() {
  return (
    <main className="min-h-screen px-4 py-12 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#333333] mb-1">Pago seguro</h1>
        <p className="text-[#666666] text-sm">
          Revisa el resumen y completa el pago.
        </p>
      </div>

      <div className="mb-8">
        <Stepper />
      </div>
      
      <PaymentSummary />
    </main>
  );
}
