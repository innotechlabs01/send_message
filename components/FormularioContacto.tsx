'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { DatosContactoInput, datosContactoSchema } from '@/lib/validations';

interface FormularioContactoProps {
  onSubmit: (datos: DatosContactoInput) => void;
  isLoading?: boolean;
}

export function FormularioContacto({
  onSubmit,
  isLoading = false,
}: FormularioContactoProps) {
  const [formData, setFormData] = useState({
    email_contacto: '',
    nombre_contacto: '',
    telefono_contacto: '',
  });

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
      onSubmit(formData);
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

      <Button
        type="submit"
        disabled={isLoading}
        cargando={isLoading}
        className="w-full"
      >
        Proceder al Pago
      </Button>
    </form>
  );
}

