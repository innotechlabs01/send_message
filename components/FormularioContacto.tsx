'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { DatosContactoInput, datosContactoSchema } from '@/lib/validations';

interface FormularioContactoProps {
  datosIniciales?: {
    email_contacto: string;
    nombre_contacto: string;
    telefono_contacto: string;
  };
  onSubmit: (datos: DatosContactoInput, programarMas: boolean) => void;
  isLoading?: boolean;
}

export function FormularioContacto({
  datosIniciales,
  onSubmit,
  isLoading = false,
}: FormularioContactoProps) {
  const [formData, setFormData] = useState({
    email_contacto: datosIniciales?.email_contacto ?? '',
    nombre_contacto: datosIniciales?.nombre_contacto ?? '',
    telefono_contacto: datosIniciales?.telefono_contacto ?? '',
  });

  const [programarMas, setProgramarMas] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpiar error cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({
      email_contacto: true,
      nombre_contacto: true,
      telefono_contacto: true,
    });

    try {
      datosContactoSchema.parse(formData);
      setErrors({});
      onSubmit(formData, programarMas);
    } catch (error) {
      const newErrors: Record<string, string> = {};
      if (error instanceof Error && 'errors' in error) {
        const zodError = error as { errors: Array<{ path: Array<string | number>; message: string }> };
        if (Array.isArray(zodError.errors)) {
          zodError.errors.forEach((err: { path: Array<string | number>; message: string }) => {
            newErrors[String(err.path[0])] = err.message;
          });
        }
      }
      setErrors(newErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        id="email"
        type="email"
        placeholder="tu@email.com"
        value={formData.email_contacto}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
          handleChange('email_contacto', e.target.value)
        }
        onBlur={() => handleBlur('email_contacto')}
        disabled={isLoading}
        error={touched.email_contacto ? errors.email_contacto : undefined}
      />

      <Input
        label="Nombre Completo"
        id="nombre"
        type="text"
        placeholder="Tu nombre"
        value={formData.nombre_contacto}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
          handleChange('nombre_contacto', e.target.value)
        }
        onBlur={() => handleBlur('nombre_contacto')}
        disabled={isLoading}
        error={touched.nombre_contacto ? errors.nombre_contacto : undefined}
      />

      <Input
        label="Teléfono"
        id="telefono"
        type="tel"
        placeholder="3001234567"
        maxLength={10}
        value={formData.telefono_contacto}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
          handleChange('telefono_contacto', e.target.value.replace(/\D/g, ''))
        }
        onBlur={() => handleBlur('telefono_contacto')}
        disabled={isLoading}
        error={touched.telefono_contacto ? errors.telefono_contacto : undefined}
        hint="10 dígitos, empieza en 3"
        inputMode="numeric"
      />

      {/* Checkbox: Programar más mensajes - CON INDICADOR VISUAL */}
      <div className={`p-4 rounded-lg border-2 transition-all ${
        programarMas 
          ? 'bg-[#E8F5E9] border-[#4CAF50]' 
          : 'bg-[#FCE4EC] border-[#E91E63]'
      }`}>
        <div className="flex items-start gap-3 mb-2">
          <input
            type="checkbox"
            id="programar_mas"
            checked={programarMas}
            onChange={(e) => setProgramarMas(e.target.checked)}
            disabled={isLoading}
            className="w-5 h-5 mt-0.5 rounded border-[#CCCCCC] text-[#4A90D9] cursor-pointer accent-[#4A90D9]"
          />
          <div className="flex-1">
            <label
              htmlFor="programar_mas"
              className="block text-sm font-medium text-[#333333] cursor-pointer"
            >
              ¿Deseas programar más mensajes?
            </label>
            <p className={`text-xs mt-1 ${
              programarMas ? 'text-[#2E7D32]' : 'text-[#C2185B]'
            }`}>
              {programarMas ? (
                <>✅ Modo: Guardar y volver a crear más</>
              ) : (
                <>💳 Modo: Proceder directamente al pago</>
              )}
            </p>
          </div>
          {/* Badge del estado */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            programarMas
              ? 'bg-[#4CAF50] text-white'
              : 'bg-[#E91E63] text-white'
          }`}>
            {programarMas ? 'Guardando' : 'Pagando'}
          </div>
        </div>

        {/* Información adicional */}
        <div className={`text-xs mt-2 p-2 rounded ${
          programarMas 
            ? 'bg-white/50 text-[#2E7D32]' 
            : 'bg-white/50 text-[#C2185B]'
        }`}>
          {programarMas ? (
            'Tu mensaje se guardará en la lista de espera. Podrás crear más mensajes antes de pagar.'
          ) : (
            'Todos tus mensajes guardados + este se pagarán ahora.'
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        cargando={isLoading}
        variante={programarMas ? 'secondary' : 'primary'}
        className="w-full"
      >
        {programarMas ? '💾 Guardar y Programar Más' : '💳 Proceder al Pago'}
      </Button>
    </form>
  );
}

