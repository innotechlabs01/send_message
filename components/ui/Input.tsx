import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const estadoClase = error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-[#CCCCCC] focus:ring-[#4A90D9]';

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-[#333333]">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={[error ? errorId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined}
          className={[
            'min-h-[44px] px-3 py-2 rounded-lg border bg-white text-[#333333]',
            'text-sm placeholder:text-[#999999]',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:text-[#999999]',
            'transition-colors duration-150',
            estadoClase,
            className,
          ].join(' ')}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-[#666666]">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
