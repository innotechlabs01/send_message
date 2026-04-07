import { z } from 'zod';

/** Celular colombiano: 10 dígitos que empiezan en 3, se transforma a +57 */
export const celularColombiano = z
  .string()
  .regex(/^3[0-9]{9}$/, 'Aún no tenemos disponible el servicio fuera de Colombia')
  .transform((val) => `+57${val}`);

/** Fecha futura (mínimo hoy) */
const fechaFutura = z
  .string()
  .min(1, 'La fecha de envío es requerida')
  .refine((val) => {
    // Parsear la fecha en formato YYYY-MM-DD sin conversión a UTC
    const [year, month, day] = val.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha >= hoy;
  }, 'La fecha de envío debe ser hoy o en el futuro');

/** Schema para personalizar el mensaje */
export const personalizarSchema = z.object({
  nombre_destinatario: z
    .string()
    .min(1, 'El nombre del destinatario es requerido')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-Z]([a-zA-Z\s]*[a-zA-Z])?$/, 'Solo se permiten letras y espacios (mínimo una letra)')
    .transform((v) => v.trim()),
  nombre_remitente: z
    .string()
    .min(1, 'Tu nombre es requerido')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-Z]([a-zA-Z\s]*[a-zA-Z])?$/, 'Solo se permiten letras y espacios (mínimo una letra)')
    .transform((v) => v.trim()),
});

/** Schema completo para crear un mensaje programado */
export const crearMensajeSchema = z.object({
  nombre_destinatario: z
    .string()
    .min(1, 'El nombre del destinatario es requerido')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-Z]([a-zA-Z\s]*[a-zA-Z])?$/, 'Solo se permiten letras y espacios (mínimo una letra)')
    .transform((v) => v.trim()),
  nombre_remitente: z
    .string()
    .min(1, 'Tu nombre es requerido')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-Z]([a-zA-Z\s]*[a-zA-Z])?$/, 'Solo se permiten letras y espacios (mínimo una letra)')
    .transform((v) => v.trim()),
  texto_final: z
    .string()
    .min(1, 'El texto del mensaje es requerido')
    .max(1600, 'El mensaje no puede superar 1600 caracteres'),
  celular_destinatario: celularColombiano,
  celular_remitente: celularColombiano,
  fecha_envio: fechaFutura,
  email_contacto: z
    .string()
    .email('Email inválido')
    .optional()
    .transform((v) => v?.toLowerCase().trim()),
  nombre_contacto: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-Z]([a-zA-Z\s]*[a-zA-Z])?$/, 'Solo se permiten letras y espacios (mínimo una letra)')
    .optional()
    .transform((v) => v?.trim()),
  telefono_contacto: celularColombiano.optional(),
});

export type PersonalizarInput = z.input<typeof personalizarSchema>;
export type CrearMensajeInput = z.input<typeof crearMensajeSchema>;
export type CrearMensajeOutput = z.output<typeof crearMensajeSchema>;

/** Schema para validar datos de contacto en pago */
export const datosContactoSchema = z.object({
  email_contacto: z
    .string()
    .email('Email inválido')
    .transform((v) => v.toLowerCase().trim()),
  nombre_contacto: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-Z]([a-zA-Z\s]*[a-zA-Z])?$/, 'Solo se permiten letras y espacios (mínimo una letra)')
    .transform((v) => v.trim()),
  telefono_contacto: celularColombiano,
});

export type DatosContactoInput = z.input<typeof datosContactoSchema>;
export type DatosContactoOutput = z.output<typeof datosContactoSchema>;
