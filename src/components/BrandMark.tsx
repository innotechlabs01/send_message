import Link from "next/link";
import { Sparkles } from "lucide-react";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 group ${className}`}
      aria-label="ConSentido — Inicio"
    >
      <span className="w-8 h-8 rounded-lg glass grid place-items-center transition-transform group-hover:scale-105">
        <Sparkles className="w-4 h-4 text-primary" />
      </span>
      <span className="font-display font-semibold tracking-tight text-base">
        Con<span className="text-primary">Sentido</span>
      </span>
    </Link>
  );
}
