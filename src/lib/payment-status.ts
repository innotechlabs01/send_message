const SUCCESS_STATES = ['SUCCESS'];
const PENDING_STATES = ['PENDING', 'PROCESSING', 'IN_PROGRESS'];
const FAILURE_STATES = ['FAILED', 'ERROR', 'CANCELLED', 'DECLINED', 'EXPIRED', 'VOIDED', 'ABANDONED', 'REJECTED'];

export type PaymentState = 'pending' | 'success' | 'failure';

export interface PaymentStatusCopy {
  state: PaymentState;
  title: string;
  message: string;
  errorCode?: string;
}

export function getPaymentStatusCopy(status: string, error?: string): PaymentStatusCopy {
  if (error) {
    return {
      state: 'failure',
      title: 'Ocurrió un error al verificar tu pago',
      message: 'Intenta nuevamente o contacta a soporte.',
      errorCode: error,
    };
  }

  const normalized = status.toUpperCase();

  if (SUCCESS_STATES.includes(normalized)) {
    return {
      state: 'success',
      title: '¡Pago exitoso!',
      message: 'Tu pago se procesó correctamente. Ya puedes cerrar esta página.',
    };
  }

  if (FAILURE_STATES.includes(normalized)) {
    return {
      state: 'failure',
      title: 'El pago no se completó',
      message: 'Tu pago no pudo ser procesado. Por favor inténtalo nuevamente.',
    };
  }

  return {
    state: 'pending',
    title: 'Verificando tu pago',
    message: 'Estamos confirmando el estado de tu pago. Esto puede tomar unos segundos.',
  };
}