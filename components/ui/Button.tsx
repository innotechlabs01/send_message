import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variante = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
}

const estilos: Record<Variante, string> = {
  primary:
    'bg-[#4A90D9] text-white hover:bg-[#357ABD] active:bg-[#2A6099] disabled:bg-[#A0C4E8]',
  secondary:
    'bg-white text-[#4A90D9] border border-[#4A90D9] hover:bg-[#EBF4FF] active:bg-[#D6E9FF] disabled:opacity-50',
  ghost:
    'bg-transparent text-[#4A90D9] hover:bg-[#EBF4FF] active:bg-[#D6E9FF] disabled:opacity-50',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variante = 'primary', cargando = false, disabled, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || cargando}
        aria-busy={cargando}
        className={[
          'inline-flex items-center justify-center gap-2',
          'min-h-[44px] min-w-[44px] px-6 py-2.5',
          'rounded-lg font-medium text-sm',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90D9] focus-visible:ring-offset-2',
          'cursor-pointer disabled:cursor-not-allowed',
          estilos[variante],
          className,
        ].join(' ')}
        {...props}
      >
        {cargando && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
