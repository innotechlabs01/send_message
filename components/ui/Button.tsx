import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variante = 'primary' | 'secondary' | 'terciary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
}

const estilos: Record<Variante, string> = {
  primary:
    "bg-primary-450 text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "bg-white text-primary-600 border border-[#E8E8E8] hover:bg-[#E5F1FD] active:bg-[#D4E6FC] focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
  terciary:
    "bg-transparent text-primary-600 hover:bg-[#E5F1FD] active:bg-[#D4E6FC] focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variante = 'primary', cargando = false, disabled, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || cargando}
        aria-busy={cargando}
        className={[
          'inline-inline-flex items-center justify-center gap-2',
          'h-12 min-h-[44px] min-w-[44px] px-6',
          'rounded-screen font-medium text-base transition-all duration-150',
          'cursor-pointer',
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
