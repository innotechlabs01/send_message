// Tipos globales de ConSentido

export interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  activa: boolean;
  created_at: string;
}

export interface MensajePrediseniado {
  id: string;
  categoria_id: string;
  texto: string;
  activo: boolean;
  created_at: string;
}

export interface MensajeProgramado {
  id: string;
  user_id: string | null;
  empresa_id: string | null;
  texto_final: string;
  nombre_destinatario: string;
  nombre_remitente: string;
  celular_destinatario: string;
  celular_remitente: string;
  fecha_envio: string;
  estado: 'pendiente' | 'enviado' | 'fallido';
  referencia_pago: string | null;
  recordatorio_enviado: boolean;
  intentos_envio: number;
  error_detalle: string | null;
  email_contacto: string | null;
  nombre_contacto: string | null;
  telefono_contacto: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
