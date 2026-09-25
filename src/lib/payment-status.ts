const SUCCESS_STATES = ['SUCCESS'];
const PENDING_STATES = ['PENDING', 'PROCESSING', 'IN_PROGRESS'];
const FAILURE_STATES = ['FAILED', 'ERROR', 'CANCELLED', 'DECLINED', 'EXPIRED', 'VOIDED', 'ABANDONED', 'REJECTED'];

export type PaymentState = 'pending' | 'success' | 'failure' | 'gateway_blocked';

export interface PaymentStatusCopy {
  state: PaymentState;
  title: string;
  message: string;
  errorCode?: string;
  gatewayReason?: string;
}

export interface PaymentRecord {
  referenceId: string;
  state: PaymentState;
  boldStatus: string;
  amount: number;
  gatewayReason?: string;
  gatewayRaw?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function getPaymentStatusCopy(status: string, error?: string, gatewayReason?: string): PaymentStatusCopy {
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

  // Check gateway blocked FIRST before general failure states
  const isGatewayBlocked = ['DECLINED', 'REJECTED', 'BLOCKED'].includes(normalized);
  if (isGatewayBlocked) {
    return {
      state: 'gateway_blocked',
      title: 'Pago bloqueado por la pasarela',
      message: 'La pasarela de pagos rechazó la transacción. Verifica los detalles abajo.',
      gatewayReason: gatewayReason,
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