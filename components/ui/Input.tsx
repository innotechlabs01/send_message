import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icono?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icono, id, className = '', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const bordeClase = error
      ? 'border-red-400 focus:ring-red-400'
      : 'border-[#D9D9D9] focus:border-primary-450 focus:ring-primary-300';

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
        <div className="relative">
          {icono && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">{icono}</div>}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={[error ? errorId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined}
            className={[
              'w-full h-12 min-h-[44px]',
              icono ? 'pl-11 pr-3' : 'px-3',
              'rounded-screen border bg-white text-text-primary',
              'text-sm placeholder:text-text-tertiary',
              'outline-none transition-all duration-150',
              'focus:ring-2 focus:ring-offset-0',
              bordeClase,
              className,
            ].join(' ')}
            {...props}
          />
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-text-tertiary">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
