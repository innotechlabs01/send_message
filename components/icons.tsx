import { SVGProps } from 'react';

export function ChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15.41 13l-5.74 5.74a2 2 0 0 1-3.41-1.42V8.83a2 2 0 0 1 3.41-1.42L15.41 11a1 1 0 0 1 0 2z" />
    </svg>
  );
}

export function ChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="8.59 13l5.74 5.74a2 2 0 0 0 3.41-1.42V8.83a2 2 0 0 0-3.41-1.42L8.59 11a1 1 0 0 0 0 2z" />
    </svg>
  );
}
