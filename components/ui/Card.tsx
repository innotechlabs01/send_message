import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean;
  elevated?: boolean;
  border?: boolean;
}

export default function Card({ clickable = false, elevated = false, border = true, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-[24px]',
        border ? 'border border-[#E8E8E8]' : '',
        elevated ? 'shadow-soft' : 'shadow-xs',
        clickable
          ? 'cursor-pointer transition-all duration-150 hover:border-[#6C9BF3] hover:shadow-hover active:scale-[0.98]'
          : '',
        className,
      ].join(' ')}
      {...props}
    >
        {children}
      </div>
  );
}
