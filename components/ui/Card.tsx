import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean;
}

export default function Card({ clickable = false, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-[#ECECEC] border border-[#CCCCCC] rounded-xl shadow-sm',
        'p-4 sm:p-6',
        clickable
          ? 'cursor-pointer hover:shadow-md hover:border-[#4A90D9] transition-all duration-150 active:scale-[0.98]'
          : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
