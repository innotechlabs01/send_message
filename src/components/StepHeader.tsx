import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
}

export function StepHeader({ step, total, title, subtitle, backTo, backLabel = "Atrás" }: Props) {
  const progress = (step / total) * 100;
  return (
    <header className="mb-10 animate-rise">
      <div className="flex items-center justify-between mb-6">
        <BrandMark />
        <span className="text-sm text-muted-foreground tabular-nums">
          Paso {step} <span className="opacity-50">/ {total}</span>
        </span>
      </div>
      {backTo && (
        <div className="mb-4">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        </div>
      )}
      <div className="h-[2px] w-full bg-muted rounded-full overflow-hidden mb-8">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%`, background: "var(--gradient-primary)" }}
        />
      </div>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-3 text-muted-foreground text-lg max-w-2xl">{subtitle}</p>}
    </header>
  );
}
